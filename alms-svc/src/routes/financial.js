const router = require("express").Router();
const { prisma } = require("../prisma");

function toBigInt(value, field) {
  if (value === undefined || value === null || value === "") {
    throw Object.assign(new Error(`${field} is required`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  try {
    return BigInt(value);
  } catch {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
}

router.get("/summary", async (req, res, next) => {
  try {
    const assetId = toBigInt(req.query.assetId, "assetId");
    const limitMonths = Math.max(1, Math.min(Number(req.query.limit || 24), 120));

    const snapshots = await prisma.assetFinancialSnapshot.findMany({
      where: { assetId },
      orderBy: { periodStart: "desc" },
      take: limitMonths,
    });

    const totals = snapshots.reduce(
      (acc, snap) => {
        acc.depreciation += Number(snap.depreciation ?? 0);
        acc.maintenance += Number(snap.maintenanceCost ?? 0);
        acc.latestBookValue = acc.latestBookValue ?? Number(snap.bookValue ?? 0);
        return acc;
      },
      { depreciation: 0, maintenance: 0, latestBookValue: null }
    );

    res.json({
      assetId: assetId.toString(),
      totals,
      periods: snapshots
        .map((snap) => ({
          periodStart: snap.periodStart,
          periodEnd: snap.periodEnd,
          depreciation: Number(snap.depreciation ?? 0),
          maintenanceCost: Number(snap.maintenanceCost ?? 0),
          bookValue: Number(snap.bookValue ?? 0),
        }))
        .reverse(),
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
