const router = require("express").Router();
const { prisma } = require("../prisma");

function hasManagerRights(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.includes("MANAGER") || roles.includes("ADMIN");
}

function ensureManager(req, res, next) {
  if (!hasManagerRights(req.user)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}
const ALLOWED = {
  OPEN: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

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

// CREATE
router.post("/", async (req, res, next) => {
  try {
    const { woNo, assetId, type, notes, scheduledAt } = req.body || {};
    if (!woNo || !assetId || !type) {
      return res.status(400).json({ error: "woNo, assetId, type are required" });
    }
    const assetIdBig = toBigInt(assetId, "assetId");

    const row = await prisma.maintenanceWorkOrder.create({
      data: {
        woNo,
        assetId: assetIdBig,
        type,
        notes: notes || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });
    await prisma.asset.update({ where: { id: assetIdBig }, data: { status: "UNDER_MAINTENANCE" } });
    res.status(201).json(row);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// LIST
router.get("/", async (req, res, next) => {
  try {
    const { assetId, status, q, skip = 0, take = 50 } = req.query;
    const where = {
      assetId: assetId ? toBigInt(assetId, "assetId") : undefined,
      status: status || undefined,
      ...(q
        ? {
            OR: [
              { woNo: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
              { technician: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.maintenanceWorkOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: Number(skip),
        take: Math.min(Number(take), 200),
      }),
      prisma.maintenanceWorkOrder.count({ where }),
    ]);
    res.json({ total, rows });
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// READ
router.get("/:id", async (req, res, next) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const row = await prisma.maintenanceWorkOrder.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// STATUS transition
router.patch("/:id/status", ensureManager, async (req, res, next) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const { status, cost, technician, message } = req.body || {};
    if (!status) return res.status(400).json({ error: "status is required" });

    const cur = await prisma.maintenanceWorkOrder.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ error: "WO not found" });

    const allowed = ALLOWED[cur.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Illegal transition ${cur.status} -> ${status}` });
    }

    const data = {
      status,
      technician: technician ?? cur.technician,
      updatedAt: new Date(),
    };
    if (status === "IN_PROGRESS") data.startedAt = new Date();
    if (status === "COMPLETED") data.completedAt = new Date();
    if (cost != null) data.cost = cost;

    const nextState = await prisma.maintenanceWorkOrder.update({ where: { id }, data });

    if (status === "COMPLETED") {
      if (message) {
        await prisma.repairLog.create({
          data: { assetId: cur.assetId, woId: id, description: message, cost: cost || 0 },
        });
      }
      await prisma.asset.update({ where: { id: cur.assetId }, data: { status: "ACTIVE" } });
    } else if (status === "CANCELLED") {
      await prisma.asset.update({ where: { id: cur.assetId }, data: { status: "ACTIVE" } });
    } else if (status === "IN_PROGRESS" || status === "SCHEDULED") {
      await prisma.asset.update({ where: { id: cur.assetId }, data: { status: "UNDER_MAINTENANCE" } });
    }

    res.json(nextState);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

module.exports = router;


