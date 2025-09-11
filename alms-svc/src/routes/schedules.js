const router = require("express").Router();
const { prisma } = require("../prisma");

// CREATE
router.post("/", async (req, res, next) => {
  try {
    const { assetId, type, intervalDays, nextDue, notes } = req.body;
    const row = await prisma.maintenanceSchedule.create({
      data: {
        assetId: BigInt(assetId),
        type,
        intervalDays: intervalDays ?? null,
        nextDue: nextDue ? new Date(nextDue) : null,
        notes: notes || null
      }
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

// LIST
router.get("/", async (req, res, next) => {
  try {
    const { assetId, dueBefore, skip=0, take=50 } = req.query;
    const where = {
      assetId: assetId ? BigInt(assetId) : undefined,
      ...(dueBefore ? { nextDue: { lte: new Date(dueBefore) } } : {})
    };
    const [rows, total] = await Promise.all([
      prisma.maintenanceSchedule.findMany({
        where, orderBy: { nextDue: "asc" },
        skip: Number(skip), take: Math.min(Number(take), 200)
      }),
      prisma.maintenanceSchedule.count({ where })
    ]);
    res.json({ total, rows });
  } catch (e) { next(e); }
});

// READ
router.get("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const row = await prisma.maintenanceSchedule.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { next(e); }
});

// UPDATE
router.put("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { type, intervalDays, nextDue, notes } = req.body;
    const row = await prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        type,
        intervalDays: intervalDays ?? null,
        nextDue: nextDue ? new Date(nextDue) : null,
        notes: notes ?? null
      }
    });
    res.json(row);
  } catch (e) { next(e); }
});

// DELETE (allowed for schedules)
router.delete("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    await prisma.maintenanceSchedule.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
