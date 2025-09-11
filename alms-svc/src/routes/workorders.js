const router = require("express").Router();
const { prisma } = require("../prisma");

const ALLOWED = {
  OPEN:        ["SCHEDULED", "CANCELLED"],
  SCHEDULED:   ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED:   [],
  CANCELLED:   []
};

// CREATE
router.post("/", async (req, res, next) => {
  try {
    const { woNo, assetId, type, notes, scheduledAt } = req.body;
    const row = await prisma.maintenanceWorkOrder.create({
      data: {
        woNo,
        assetId: BigInt(assetId),
        type,
        notes: notes || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });
    await prisma.asset.update({ where: { id: BigInt(assetId) }, data: { status: "UNDER_MAINTENANCE" } });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

// LIST
router.get("/", async (req, res, next) => {
  try {
    const { assetId, status, q, skip=0, take=50 } = req.query;
    const where = {
      assetId: assetId ? BigInt(assetId) : undefined,
      status:  status || undefined,
      ...(q ? { OR: [
        { woNo:  { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { technician: { contains: q, mode: "insensitive" } }
      ]} : {})
    };
    const [rows, total] = await Promise.all([
      prisma.maintenanceWorkOrder.findMany({
        where, orderBy: { createdAt: "desc" },
        skip: Number(skip), take: Math.min(Number(take), 200)
      }),
      prisma.maintenanceWorkOrder.count({ where })
    ]);
    res.json({ total, rows });
  } catch (e) { next(e); }
});

// READ
router.get("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const row = await prisma.maintenanceWorkOrder.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { next(e); }
});

// STATUS transition
router.patch("/:id/status", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { status, cost, technician, message } = req.body;
    const cur = await prisma.maintenanceWorkOrder.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ error: "WO not found" });

    const allowed = ALLOWED[cur.status] || [];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Illegal transition ${cur.status} -> ${status}` });

    const data = { status, technician: technician ?? cur.technician, updatedAt: new Date() };
    if (status === "IN_PROGRESS") data.startedAt = new Date();
    if (status === "COMPLETED")   data.completedAt = new Date();
    if (cost != null) data.cost = cost;

    const next = await prisma.maintenanceWorkOrder.update({ where: { id }, data });

    if (status === "COMPLETED" && message) {
      await prisma.repairLog.create({
        data: { assetId: cur.assetId, woId: id, description: message, cost: cost || 0 }
      });
      await prisma.asset.update({ where: { id: cur.assetId }, data: { status: "ACTIVE" } });
    }
    res.json(next);
  } catch (e) { next(e); }
});

module.exports = router;
