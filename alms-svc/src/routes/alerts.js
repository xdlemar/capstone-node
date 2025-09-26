const router = require("express").Router();
const { prisma } = require("../prisma");

function toBigInt(value, field, { optional = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
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

router.get("/", async (req, res, next) => {
  try {
    const unresolved = String(req.query.unresolved || "").toLowerCase() === "true";
    const assetId = req.query.assetId ? toBigInt(req.query.assetId, "assetId") : null;

    const rows = await prisma.maintenanceAlert.findMany({
      where: {
        ...(unresolved ? { resolvedAt: null } : {}),
        ...(assetId ? { assetId } : {}),
      },
      include: {
        asset: { select: { id: true, assetCode: true, status: true } },
        schedule: { select: { id: true, nextDue: true, type: true } },
      },
      orderBy: { triggeredAt: "desc" },
    });

    res.json(
      rows.map((row) => ({
        id: row.id.toString(),
        assetId: row.assetId.toString(),
        scheduleId: row.scheduleId ? row.scheduleId.toString() : null,
        type: row.type,
        message: row.message,
        triggeredAt: row.triggeredAt,
        resolvedAt: row.resolvedAt,
        asset: {
          id: row.asset.id.toString(),
          assetCode: row.asset.assetCode,
          status: row.asset.status,
        },
        schedule: row.schedule
          ? {
              id: row.schedule.id.toString(),
              nextDue: row.schedule.nextDue,
              type: row.schedule.type,
            }
          : null,
      }))
    );
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.post("/:id/resolve", async (req, res, next) => {
  try {
    const id = toBigInt(req.params.id, "id");

    const alert = await prisma.maintenanceAlert.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });

    res.json({
      id: alert.id.toString(),
      type: alert.type,
      resolvedAt: alert.resolvedAt,
    });
  } catch (err) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Alert not found" });
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
