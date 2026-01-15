const { Router } = require("express");
const { prisma } = require("../prisma");

const router = Router();

function clampNumber(value, { min, max, fallback }) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function daysBetween(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

async function requestAzureForecast({ endpoint, key, deployment, payload }) {
  if (!endpoint || !key || typeof fetch !== "function") {
    return null;
  }
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    };
    if (deployment) {
      headers["azureml-model-deployment"] = deployment;
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      console.warn("[forecast] Azure maintenance forecast failed", response.status, text);
      return null;
    }
    return response.json();
  } catch (err) {
    console.warn("[forecast] Azure maintenance forecast error", err?.message || err);
    return null;
  }
}

function applyAzureOverrides(rows, azureItems) {
  if (!Array.isArray(azureItems)) return rows;
  const map = new Map();
  for (const item of azureItems) {
    const key = item?.assetId ?? item?.assetCode;
    if (key == null) continue;
    map.set(String(key), item);
  }

  return rows.map((row) => {
    const azure = map.get(String(row.assetId)) || map.get(String(row.assetCode));
    if (!azure) return row;
    return {
      ...row,
      avgIntervalDays: Number.isFinite(Number(azure.avgIntervalDays)) ? Number(azure.avgIntervalDays) : row.avgIntervalDays,
      nextDueAt: azure.nextDueAt ?? row.nextDueAt,
      risk: typeof azure.risk === "string" ? azure.risk.toUpperCase() : row.risk,
      confidence: typeof azure.confidence === "string" ? azure.confidence.toUpperCase() : row.confidence,
    };
  });
}

function buildAzureInputData(completedOrders, assetCodeMap) {
  if (!Array.isArray(completedOrders) || completedOrders.length === 0) return null;
  const countsByDayAsset = new Map();

  for (const wo of completedOrders) {
    const completedAt = wo?.completedAt ? new Date(wo.completedAt) : null;
    const date = completedAt ? formatDate(completedAt) : null;
    if (!date) continue;

    const assetId = wo?.assetId?.toString?.() ?? String(wo?.assetId ?? "");
    if (!assetId) continue;

    const assetCode = assetCodeMap.get(assetId) || assetId;
    const key = `${date}|${assetCode}`;
    countsByDayAsset.set(key, (countsByDayAsset.get(key) || 0) + 1);
  }

  if (countsByDayAsset.size === 0) return null;

  const data = [...countsByDayAsset.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, count]) => {
      const [date, assetCode] = key.split("|");
      return [date, assetCode, count];
    });

  return {
    input_data: {
      columns: ["date", "asset_id", "work_orders"],
      data,
    },
  };
}

router.get("/maintenance", async (req, res) => {
  try {
    const windowDays = clampNumber(req.query.windowDays, { min: 30, max: 365, fallback: 180 });
    const minEvents = clampNumber(req.query.minEvents, { min: 1, max: 10, fallback: 2 });
    const now = new Date();
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - windowDays + 1));

    const [assets, completedOrders] = await Promise.all([
      prisma.asset.findMany({
        select: { id: true, assetCode: true, name: true, category: true, status: true },
        where: { status: { not: "DISPOSED" } },
        orderBy: { assetCode: "asc" },
      }),
      prisma.maintenanceWorkOrder.findMany({
        where: {
          status: "COMPLETED",
          completedAt: { gte: from },
        },
        select: { assetId: true, completedAt: true },
        orderBy: { completedAt: "asc" },
      }),
    ]);

    const assetCodeMap = new Map(
      assets.map((asset) => [asset.id.toString(), asset.assetCode ? String(asset.assetCode) : asset.id.toString()]),
    );

    const historyMap = new Map();
    for (const wo of completedOrders) {
      if (!wo.completedAt) continue;
      const key = wo.assetId.toString();
      const list = historyMap.get(key) || [];
      list.push(new Date(wo.completedAt));
      historyMap.set(key, list);
    }

    const rows = assets
      .map((asset) => {
        const key = asset.id.toString();
        const history = historyMap.get(key) || [];
        const historyCount = history.length;
        let avgIntervalDays = null;
        let lastCompletedAt = null;
        let nextDueAt = null;

        if (historyCount > 0) {
          history.sort((a, b) => a.getTime() - b.getTime());
          lastCompletedAt = history[history.length - 1];
        }

        if (historyCount >= 2) {
          const intervals = [];
          for (let i = 1; i < history.length; i += 1) {
            intervals.push(daysBetween(history[i - 1], history[i]));
          }
          avgIntervalDays = Math.round(intervals.reduce((sum, val) => sum + val, 0) / intervals.length);
          if (lastCompletedAt) {
            nextDueAt = new Date(lastCompletedAt.getTime() + avgIntervalDays * 24 * 60 * 60 * 1000);
          }
        }

        let risk = "UNKNOWN";
        if (nextDueAt) {
          const daysUntil = Math.ceil((nextDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 0) risk = "HIGH";
          else if (daysUntil <= 14) risk = "MEDIUM";
          else risk = "LOW";
        }

        let confidence = "LOW";
        if (historyCount >= 5) confidence = "HIGH";
        else if (historyCount >= 3) confidence = "MEDIUM";

        return {
          assetId: key,
          assetCode: asset.assetCode,
          name: asset.name || asset.assetCode,
          category: asset.category,
          status: asset.status,
          historyCount,
          lastCompletedAt: lastCompletedAt ? lastCompletedAt.toISOString() : null,
          avgIntervalDays,
          nextDueAt: nextDueAt ? nextDueAt.toISOString() : null,
          risk,
          confidence,
        };
      })
      .filter((row) => row.historyCount >= minEvents);

    const azurePayload = buildAzureInputData(completedOrders, assetCodeMap);

    const azureResponse = azurePayload
      ? await requestAzureForecast({
          endpoint: process.env.AZURE_MAINT_FORECAST_ENDPOINT,
          key: process.env.AZURE_MAINT_FORECAST_KEY,
          deployment: process.env.AZURE_MAINT_FORECAST_DEPLOYMENT,
          payload: azurePayload,
        })
      : null;

    const itemsOut = azureResponse?.items ? applyAzureOverrides(rows, azureResponse.items) : rows;
    const source = azureResponse?.items ? "azure" : "heuristic";

    res.json({
      generatedAt: now,
      windowDays,
      minEvents,
      source,
      items: itemsOut,
    });
  } catch (err) {
    console.error("[GET /forecast/maintenance]", err);
    res.status(500).json({ error: "Failed to build maintenance forecast" });
  }
});

module.exports = router;
