const router = require("express").Router();
const { prisma } = require("../prisma");

const ALLOWED = {
  DRAFT: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT", "DELAYED", "CANCELLED"],
  IN_TRANSIT: ["DELAYED", "DELIVERED", "CANCELLED"],
  DELAYED: ["IN_TRANSIT", "DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const ALERT_TYPES = {
  STATUS_DELAY: "STATUS_DELAY",
  ETA_MISSED: "ETA_MISSED",
};

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

function toDate(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  return dt;
}

async function ensureAlert(deliveryId, type, message) {
  const existing = await prisma.deliveryAlert.findFirst({
    where: { deliveryId, type, resolvedAt: null },
  });

  if (!existing) {
    await prisma.deliveryAlert.create({
      data: { deliveryId, type, message },
    });
    return;
  }

  if (existing.message !== message) {
    await prisma.deliveryAlert.update({
      where: { id: existing.id },
      data: { message },
    });
  }
}

async function resolveAlerts(deliveryId, type = null) {
  await prisma.deliveryAlert.updateMany({
    where: {
      deliveryId,
      resolvedAt: null,
      ...(type ? { type } : {}),
    },
    data: { resolvedAt: new Date() },
  });
}

// Create delivery
router.post("/", async (req, res, next) => {
  try {
    const projectId = toBigInt(req.body.projectId, "projectId");
    const poId = toBigInt(req.body.poId, "poId", { optional: true });
    const vendorId = toBigInt(req.body.vendorId, "vendorId", { optional: true });
    const eta = toDate(req.body.eta, "eta");
    const departedAt = toDate(req.body.departedAt, "departedAt");

    const delivery = await prisma.delivery.create({
      data: {
        projectId,
        poId,
        vendorId,
        eta,
        departedAt,
        trackingNo: req.body.trackingNo || null,
        lastKnown: req.body.lastKnown || null,
        notes: req.body.notes || null,
      },
    });

    res.status(201).json(delivery);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// Update status + append DeliveryUpdate
router.patch("/:id/status", async (req, res, next) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const { status, message, place } = req.body || {};
    if (!status) return res.status(400).json({ error: "status is required" });

    const occurredAt = toDate(req.body.occurredAt, "occurredAt");

    const cur = await prisma.delivery.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ error: "Not found" });
    if (!ALLOWED[cur.status].includes(status)) {
      return res.status(400).json({ error: `Illegal ${cur.status} -> ${status}` });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.delivery.update({
        where: { id },
        data: {
          status,
          arrivedAt: status === "DELIVERED" ? new Date() : cur.arrivedAt,
          lastKnown: req.body.lastKnown ?? cur.lastKnown,
        },
      });

      await tx.deliveryUpdate.create({
        data: {
          deliveryId: id,
          status,
          message: message || null,
          place: place || null,
          occurredAt: occurredAt || undefined,
        },
      });

      return d;
    });

    if (status === "DELIVERED" || status === "CANCELLED") {
      await resolveAlerts(id);
    } else if (status === "DELAYED") {
      const baseMessage = message || "Delivery flagged as delayed";
      await ensureAlert(id, ALERT_TYPES.STATUS_DELAY, baseMessage);
    } else {
      await resolveAlerts(id, ALERT_TYPES.STATUS_DELAY);
    }

    const eta = updated.eta ? new Date(updated.eta) : null;
    if (eta && updated.status !== "DELIVERED" && updated.status !== "CANCELLED") {
      if (Date.now() > eta.getTime()) {
        await ensureAlert(
          id,
          ALERT_TYPES.ETA_MISSED,
          `Delivery ${id.toString()} missed ETA ${eta.toISOString()}`
        );
      } else {
        await resolveAlerts(id, ALERT_TYPES.ETA_MISSED);
      }
    } else {
      await resolveAlerts(id, ALERT_TYPES.ETA_MISSED);
    }

    res.json(updated);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// List deliveries with filters (+ simple pagination)
router.get("/", async (req, res, next) => {
  try {
    const { projectId, poId, status, skip = 0, take = 50 } = req.query;
    const where = {
      projectId: projectId ? toBigInt(projectId, "projectId") : undefined,
      poId: poId ? toBigInt(poId, "poId") : undefined,
      status: status || undefined,
    };
    const rows = await prisma.delivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: Number(skip),
      take: Math.min(Number(take), 200),
      include: {
        alerts: {
          where: { resolvedAt: null },
          orderBy: { triggeredAt: "desc" },
        },
      },
    });
    res.json(rows);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

module.exports = router;
