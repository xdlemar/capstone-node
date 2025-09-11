const router = require("express").Router();
const { prisma } = require("../prisma");

// CREATE
router.post("/", async (req, res, next) => {
  try {
    const { assetId, woId, description, cost, notes } = req.body;
    const row = await prisma.repairLog.create({
      data: {
        assetId: BigInt(assetId),
        woId: woId ? BigInt(woId) : null,
        description,
        cost: cost || 0,
        notes: notes || null
      }
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

// LIST
router.get("/", async (req, res, next) => {
  try {
    const { assetId, woId, skip=0, take=50 } = req.query;
    const where = {
      assetId: assetId ? BigInt(assetId) : undefined,
      woId: woId ? BigInt(woId) : undefined
    };
    const [rows, total] = await Promise.all([
      prisma.repairLog.findMany({
        where, orderBy: { repairedAt: "desc" },
        skip: Number(skip), take: Math.min(Number(take), 200)
      }),
      prisma.repairLog.count({ where })
    ]);
    res.json({ total, rows });
  } catch (e) { next(e); }
});

// READ
router.get("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const row = await prisma.repairLog.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { next(e); }
});

module.exports = router;
