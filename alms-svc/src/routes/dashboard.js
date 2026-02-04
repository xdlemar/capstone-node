const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { requireRole } = require("../auth");

const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

function toNumber(value) {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

router.get("/dashboard/summary", staffAccess, async (_req, res) => {
  try {
    const now = new Date();
    const upcomingThreshold = new Date(now);
    upcomingThreshold.setDate(now.getDate() + 14);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      activeAssets,
      openWorkOrders,
      maintenanceDueSoon,
      assetRecords,
      repairLast30,
      repairYear,
      workOrderLast30,
      workOrderYear,
      topMaintenanceSpend,
    ] = await Promise.all([
      prisma.asset.count({ where: { status: { notIn: ["RETIRED", "DISPOSED"] } } }),
      prisma.maintenanceWorkOrder.count({
        where: { status: { in: ["OPEN", "SCHEDULED", "IN_PROGRESS"] } },
      }),
      prisma.maintenanceSchedule.count({
        where: {
          nextDue: {
            not: null,
            gte: now,
            lte: upcomingThreshold,
          },
        },
      }),
      prisma.asset.findMany({
        where: { status: { notIn: ["DISPOSED"] } },
        select: {
          id: true,
          assetCode: true,
          category: true,
          status: true,
          acquisitionCost: true,
          depreciation: {
            select: {
              accumulated: true,
              salvage: true,
            },
          },
        },
      }),
      prisma.repairLog.aggregate({
        where: { repairedAt: { gte: thirtyDaysAgo } },
        _sum: { cost: true },
      }),
      prisma.repairLog.aggregate({
        where: { repairedAt: { gte: yearStart } },
        _sum: { cost: true },
      }),
      prisma.maintenanceWorkOrder.aggregate({
        where: {
          status: "COMPLETED",
          completedAt: { not: null, gte: thirtyDaysAgo },
        },
        _sum: { cost: true },
      }),
      prisma.maintenanceWorkOrder.aggregate({
        where: {
          status: "COMPLETED",
          completedAt: { not: null, gte: yearStart },
        },
        _sum: { cost: true },
      }),
      prisma.repairLog.groupBy({
        by: ["assetId"],
        where: { repairedAt: { gte: yearStart } },
        _sum: { cost: true },
        orderBy: { _sum: { cost: "desc" } },
        take: 5,
      }),
    ]);

    const assetMap = new Map(
      assetRecords.map((asset) => [asset.id.toString(), asset])
    );

    const acquisitionValue = assetRecords.reduce(
      (sum, asset) => sum + toNumber(asset.acquisitionCost),
      0
    );

    const bookValue = assetRecords.reduce((sum, asset) => {
      const acquisition = toNumber(asset.acquisitionCost);
      const accumulated = toNumber(asset.depreciation?.accumulated);
      const salvage = asset.depreciation?.salvage != null ? toNumber(asset.depreciation.salvage) : null;
      let book = acquisition - accumulated;
      if (salvage != null && book < salvage) {
        book = salvage;
      }
      if (book < 0) book = 0;
      return sum + book;
    }, 0);

    const maintenanceCost30d = toNumber(repairLast30?._sum?.cost) + toNumber(workOrderLast30?._sum?.cost);
    const maintenanceCostYtd = toNumber(repairYear?._sum?.cost) + toNumber(workOrderYear?._sum?.cost);

    const topAssetsByMaintenance = topMaintenanceSpend.map((row) => {
      const asset = assetMap.get(row.assetId.toString());
      return {
        assetId: row.assetId.toString(),
        assetCode: asset?.assetCode ?? `ASSET-${row.assetId.toString()}`,
        status: asset?.status ?? "UNKNOWN",
        category: asset?.category ?? null,
        spendYtd: toNumber(row._sum.cost),
      };
    });

    res.json({
      activeAssets,
      openWorkOrders,
      maintenanceDueSoon,
      financials: {
        acquisitionValue,
        bookValue,
        maintenanceCost30d,
        maintenanceCostYtd,
        topAssetsByMaintenance,
      },
    });
  } catch (err) {
    console.error("[alms dashboard]", err);
    res.status(500).json({ error: "Failed to load asset summary" });
  }
});

module.exports = router;
