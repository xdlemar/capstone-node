const router = require("express").Router();
const { prisma } = require("../prisma");

// CREATE (and move asset location)
router.post("/", async (req, res, next) => {
  try {
    const { assetId, fromLocId, toLocId, notes } = req.body;
    const row = await prisma.assetTransfer.create({
      data: {
        assetId: BigInt(assetId),
        fromLocId: fromLocId ? BigInt(fromLocId) : null,
        toLocId: BigInt(toLocId),
        notes: notes || null
      }
    });
    await prisma.asset.update({ where: { id: BigInt(assetId) }, data: { locationId: BigInt(toLocId) } });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

// LIST
router.get("/", async (req, res, next) => {
  try {
    const { assetId, skip=0, take=50 } = req.query;
    const where = { assetId: assetId ? BigInt(assetId) : undefined };
    const [rows, total] = await Promise.all([
      prisma.assetTransfer.findMany({
        where, orderBy: { movedAt: "desc" },
        skip: Number(skip), take: Math.min(Number(take), 200)
      }),
      prisma.assetTransfer.count({ where })
    ]);
    res.json({ total, rows });
  } catch (e) { next(e); }
});

// READ
router.get("/:id", async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const row = await prisma.assetTransfer.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { next(e); }
});

module.exports = router;
