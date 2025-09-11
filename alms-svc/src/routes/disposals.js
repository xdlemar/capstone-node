const router = require("express").Router();
const { prisma } = require("../prisma");

// CREATE (and mark asset DISPOSED)
router.post("/", async (req, res, next) => {
  try {
    const { assetId, reason, proceeds, approvedById } = req.body;
    const row = await prisma.assetDisposal.create({
      data: {
        assetId: BigInt(assetId),
        reason: reason || null,
        proceeds: proceeds ?? null,
        approvedById: approvedById ? BigInt(approvedById) : null
      }
    });
    await prisma.asset.update({ where: { id: BigInt(assetId) }, data: { status: "DISPOSED" } });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

// LIST
router.get("/", async (req, res, next) => {
  try {
    const { assetId, skip=0, take=50 } = req.query;
    const where = { assetId: assetId ? BigInt(assetId) : undefined };
    const [rows, total] = await Promise.all([
      prisma.assetDisposal.findMany({
        where, orderBy: { disposedAt: "desc" },
        skip: Number(skip), take: Math.min(Number(take), 200)
      }),
      prisma.assetDisposal.count({ where })
    ]);
    res.json({ total, rows });
  } catch (e) { next(e); }
});

// READ
router.get("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const row = await prisma.assetDisposal.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { next(e); }
});

module.exports = router;
