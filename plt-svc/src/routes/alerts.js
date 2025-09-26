const router = require("express").Router();
const { prisma } = require("../prisma");

function toBigInt(value, field) {
  if (value === undefined || value === null || value === "") return null;
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
    const projectId = toBigInt(req.query.projectId, "projectId");

    const rows = await prisma.deliveryAlert.findMany({
      where: {
        ...(unresolved ? { resolvedAt: null } : {}),
        ...(projectId
          ? { delivery: { projectId } }
          : {}),
      },
      orderBy: { triggeredAt: "desc" },
      include: {
        delivery: {
          select: { id: true, projectId: true, status: true, trackingNo: true, eta: true },
        },
      },
    });

    res.json(
      rows.map((row) => ({
        id: row.id.toString(),
        deliveryId: row.deliveryId.toString(),
        type: row.type,
        message: row.message,
        triggeredAt: row.triggeredAt,
        resolvedAt: row.resolvedAt,
        delivery: {
          id: row.delivery.id.toString(),
          projectId: row.delivery.projectId.toString(),
          status: row.delivery.status,
          trackingNo: row.delivery.trackingNo,
          eta: row.delivery.eta,
        },
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
    if (!id) return res.status(400).json({ error: "id required" });

    const alert = await prisma.deliveryAlert.update({
      where: { id },
      data: { resolvedAt: new Date() },
      include: { delivery: true },
    });

    res.json({
      id: alert.id.toString(),
      deliveryId: alert.deliveryId.toString(),
      type: alert.type,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
      resolvedAt: alert.resolvedAt,
    });
  } catch (err) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Alert not found" });
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
