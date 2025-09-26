const { Router } = require("express");
const { prisma } = require("../prisma");
const { currentLevels } = require("../services/stock");
const { Prisma } = require("@prisma/client");

const router = Router();

const DEFAULT_LOOKBACK = 30;
const DEFAULT_LEADTIME = 7;
const MAX_LOOKBACK = 120;
const MIN_LOOKBACK = 7;

function clampNumber(value, { min, max, fallback }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return Math.floor(n);
}

router.get("/", async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.warn("[reorder] JWT_SECRET missing; ensure service configured correctly");
    }

    const lookbackDays = clampNumber(req.query.lookbackDays, {
      min: MIN_LOOKBACK,
      max: MAX_LOOKBACK,
      fallback: DEFAULT_LOOKBACK,
    });
    const leadTimeDays = clampNumber(req.query.leadTimeDays, {
      min: 1,
      max: 30,
      fallback: DEFAULT_LEADTIME,
    });

    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const thresholds = await prisma.threshold.findMany({
      include: {
        item: { select: { id: true, sku: true, name: true, unit: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: [{ itemId: "asc" }],
    });

    if (!thresholds.length) {
      return res.json([]);
    }

    const locationIds = Array.from(
      new Set(thresholds.map((t) => t.locationId.toString()))
    );

    const onhandByLoc = new Map();
    for (const locIdStr of locationIds) {
      const locIdBig = BigInt(locIdStr);
      const levels = await currentLevels(locIdBig);
      const map = new Map();
      for (const level of levels) {
        map.set(level.itemId.toString(), Number(level.onhand ?? 0));
      }
      onhandByLoc.set(locIdStr, map);
    }

    let usageRows = [];
    if (locationIds.length) {
      const locBig = locationIds.map((id) => BigInt(id));
      usageRows = await prisma.$queryRaw`
        SELECT "itemId", "fromLocId" AS "locationId", SUM(CAST(qty AS DOUBLE PRECISION)) AS qty
        FROM "StockMove"
        WHERE "occurredAt" >= ${since}
          AND "fromLocId" IN (${Prisma.join(locBig)})
          AND "reason" IN (${Prisma.join([
            "ISSUE",
            "TRANSFER",
            "DAMAGED",
            "ADJUSTMENT",
          ])})
        GROUP BY "itemId", "fromLocId";
      `;
    }

    const usageMap = new Map();
    for (const row of usageRows) {
      if (!row.locationId) continue;
      const key = `${row.itemId.toString()}:${row.locationId.toString()}`;
      usageMap.set(key, Number(row.qty ?? 0));
    }

    const results = thresholds.map((t) => {
      const locIdStr = t.locationId.toString();
      const itemIdStr = t.itemId.toString();
      const onhandMap = onhandByLoc.get(locIdStr) || new Map();
      const onhand = onhandMap.get(itemIdStr) ?? 0;

      const usageTotal = usageMap.get(`${itemIdStr}:${locIdStr}`) ?? 0;
      const avgDailyUsage = usageTotal / lookbackDays;
      const minQty = Number(t.minQty ?? 0);
      const target = minQty + avgDailyUsage * leadTimeDays;
      const reorderQty = Math.max(0, Math.ceil(target - onhand));

      return {
        itemId: itemIdStr,
        sku: t.item.sku,
        itemName: t.item.name,
        unit: t.item.unit,
        locationId: locIdStr,
        locationName: t.location.name,
        onhand,
        minQty,
        avgDailyUsage: Number.isFinite(avgDailyUsage) ? Number(avgDailyUsage.toFixed(2)) : 0,
        targetQty: Number.isFinite(target) ? Number(target.toFixed(2)) : minQty,
        reorderQty,
        status: reorderQty > 0 ? "REORDER" : "OK",
        lookbackDays,
        leadTimeDays,
      };
    });

    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
