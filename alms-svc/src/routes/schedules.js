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

function toDate(value, field, { optional = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    throw Object.assign(new Error(`${field} is required`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  return dt;
}

async function resolveAlertsForSchedule(scheduleId) {
  await prisma.maintenanceAlert.updateMany({
    where: { scheduleId, resolvedAt: null },
    data: { resolvedAt: new Date() },
  });
}

// CREATE
router.post("/", async (req, res, next) => {
  try {
    const assetId = toBigInt(req.body.assetId, "assetId");
    const nextDue = toDate(req.body.nextDue, "nextDue", { optional: true });

    const row = await prisma.maintenanceSchedule.create({
      data: {
        assetId,
        type: req.body.type,
        intervalDays: req.body.intervalDays ?? null,
        nextDue,
        notes: req.body.notes || null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// LIST
router.get("/", async (req, res, next) => {
  try {
    const { assetId, dueBefore, skip = 0, take = 50 } = req.query;
    const where = {
      assetId: assetId ? toBigInt(assetId, "assetId") : undefined,
      ...(dueBefore ? { nextDue: { lte: new Date(dueBefore) } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.maintenanceSchedule.findMany({
        where,
        orderBy: { nextDue: "asc" },
        skip: Number(skip),
        take: Math.min(Number(take), 200),
      }),
      prisma.maintenanceSchedule.count({ where }),
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
    const row = await prisma.maintenanceSchedule.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// UPDATE
router.put("/:id", async (req, res, next) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const nextDue = toDate(req.body.nextDue, "nextDue", { optional: true });

    const row = await prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        type: req.body.type,
        intervalDays: req.body.intervalDays ?? null,
        nextDue,
        notes: req.body.notes ?? null,
      },
    });

    if (!nextDue || nextDue > new Date()) {
      await resolveAlertsForSchedule(id);
    }

    res.json(row);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

// DELETE (allowed for schedules)
router.delete("/:id", async (req, res, next) => {
  try {
    const id = toBigInt(req.params.id, "id");
    await prisma.maintenanceSchedule.delete({ where: { id } });
    await resolveAlertsForSchedule(id);
    res.status(204).end();
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

module.exports = router;
