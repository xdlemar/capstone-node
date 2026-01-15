const { Router } = require("express");
const { prisma } = require("../prisma");
const { currentLevels } = require("../services/stock");

const router = Router();

function clampNumber(value, { min, max, fallback }) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

function toBigInt(value) {
  if (value === undefined || value === null || value === "") return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function isFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
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
      console.warn("[forecast] Azure demand forecast failed", response.status, text);
      return null;
    }
    return response.json();
  } catch (err) {
    console.warn("[forecast] Azure demand forecast error", err?.message || err);
    return null;
  }
}

function applyAzureOverrides(rows, azureItems) {
  if (!Array.isArray(azureItems)) return rows;
  const map = new Map();
  for (const item of azureItems) {
    const key = item?.itemId ?? item?.sku;
    if (key == null) continue;
    map.set(String(key), item);
  }

  return rows.map((row) => {
    const azure = map.get(String(row.itemId)) || map.get(String(row.sku));
    if (!azure) return row;
    const merged = { ...row };
    const numericFields = [
      "avgDailyUsage",
      "forecast7d",
      "forecastHorizon",
      "reorderPoint",
      "suggestedReorder",
      "daysToStockout",
    ];
    for (const field of numericFields) {
      const num = isFiniteNumber(azure[field]);
      if (num != null) {
        merged[field] = field === "suggestedReorder" ? Math.ceil(num) : num;
      }
    }
    if (typeof azure.risk === "string") {
      merged.risk = azure.risk.toUpperCase();
    }
    return merged;
  });
}

function buildAzureInputData(moves, itemSkuMap) {
  if (!Array.isArray(moves) || moves.length === 0) return null;
  const usageByDaySku = new Map();

  for (const move of moves) {
    const occurredAt = move?.occurredAt ? new Date(move.occurredAt) : null;
    const date = occurredAt ? formatDate(occurredAt) : null;
    if (!date) continue;

    const itemId = move?.itemId?.toString?.() ?? String(move?.itemId ?? "");
    if (!itemId) continue;

    const sku = itemSkuMap.get(itemId) || itemId;
    const qty = Math.abs(Number(move?.qty || 0));
    if (!Number.isFinite(qty) || qty === 0) continue;

    const key = `${date}|${sku}`;
    usageByDaySku.set(key, (usageByDaySku.get(key) || 0) + qty);
  }

  if (usageByDaySku.size === 0) return null;

  const data = [...usageByDaySku.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, qty]) => {
      const [date, sku] = key.split("|");
      return [date, sku, qty];
    });

  return {
    input_data: {
      columns: ["date", "item_id", "qty_issued"],
      data,
    },
  };
}

router.get("/demand", async (req, res) => {
  try {
    const windowDays = clampNumber(req.query.windowDays, { min: 7, max: 180, fallback: 30 });
    const horizonDays = clampNumber(req.query.horizonDays, { min: 7, max: 90, fallback: 30 });
    const leadTimeDays = clampNumber(req.query.leadTimeDays, { min: 1, max: 90, fallback: 14 });
    const reviewDays = clampNumber(req.query.reviewDays, { min: 1, max: 30, fallback: 7 });
    const safetyFactor = clampNumber(req.query.safetyFactor, { min: 1, max: 3, fallback: 1.5 });

    const locationId = toBigInt(req.query.locationId);

    const now = new Date();
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - windowDays + 1));

    const moveWhere = {
      occurredAt: { gte: from, lte: now },
      reason: { in: ["ISSUE"] },
      ...(locationId ? { fromLocId: locationId } : {}),
    };

    const [moves, items, levels] = await Promise.all([
      prisma.stockMove.findMany({
        where: moveWhere,
        select: { itemId: true, qty: true, occurredAt: true },
      }),
      prisma.item.findMany({
        where: { isActive: true },
        select: { id: true, sku: true, name: true, unit: true, minQty: true },
        orderBy: { sku: "asc" },
      }),
      currentLevels(locationId || undefined),
    ]);

    const itemSkuMap = new Map(
      items.map((item) => [item.id.toString(), item.sku ? String(item.sku) : item.id.toString()]),
    );

    const usageMap = new Map();
    for (const move of moves) {
      const key = move.itemId.toString();
      const qty = Math.abs(Number(move.qty || 0));
      if (!Number.isFinite(qty)) continue;
      usageMap.set(key, (usageMap.get(key) || 0) + qty);
    }

    const levelMap = new Map();
    for (const row of levels) {
      levelMap.set(String(row.itemId), row.onhand);
    }

    const rows = items
      .map((item) => {
        const itemId = item.id.toString();
        const totalUsage = usageMap.get(itemId) || 0;
        const avgDaily = totalUsage / windowDays;
        const onHand = Number(levelMap.get(itemId) || 0);
        const minQty = Number(item.minQty || 0);
        const forecast7d = avgDaily * 7;
        const forecastHorizon = avgDaily * horizonDays;
        const reorderBase = avgDaily * (leadTimeDays + reviewDays) * safetyFactor;
        const reorderPoint = Math.max(minQty, reorderBase);
        const suggestedReorder = Math.max(0, reorderPoint - onHand);
        const daysToStockout = avgDaily > 0 ? Math.floor(onHand / avgDaily) : null;
        let risk = "LOW";
        if (avgDaily > 0 && daysToStockout !== null) {
          if (daysToStockout <= leadTimeDays + reviewDays) risk = "HIGH";
          else if (onHand <= reorderPoint) risk = "MEDIUM";
        }

        return {
          itemId,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          onHand,
          avgDailyUsage: Number(avgDaily.toFixed(2)),
          forecast7d: Number(forecast7d.toFixed(2)),
          forecastHorizon: Number(forecastHorizon.toFixed(2)),
          horizonDays,
          minQty,
          reorderPoint: Number(reorderPoint.toFixed(2)),
          suggestedReorder: Math.ceil(suggestedReorder),
          daysToStockout,
          risk,
          totalUsage,
        };
      })
      .filter((row) => row.totalUsage > 0 || row.onHand > 0);

    const azurePayload = buildAzureInputData(moves, itemSkuMap);

    const azureResponse = azurePayload
      ? await requestAzureForecast({
          endpoint: process.env.AZURE_DEMAND_FORECAST_ENDPOINT,
          key: process.env.AZURE_DEMAND_FORECAST_KEY,
          deployment: process.env.AZURE_DEMAND_FORECAST_DEPLOYMENT,
          payload: azurePayload,
        })
      : null;

    const itemsOut = azureResponse?.items ? applyAzureOverrides(rows, azureResponse.items) : rows;
    const source = azureResponse?.items ? "azure" : "heuristic";

    res.json({
      generatedAt: now,
      windowDays,
      horizonDays,
      leadTimeDays,
      reviewDays,
      safetyFactor,
      locationId: locationId ? locationId.toString() : null,
      source,
      items: itemsOut,
    });
  } catch (err) {
    console.error("[GET /forecast/demand]", err);
    res.status(500).json({ error: "Failed to build demand forecast" });
  }
});

module.exports = router;
