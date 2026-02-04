const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

function clampNumber(value, { min, max, fallback }) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return Math.floor(num);
}

r.post("/", async (req, res) => {
  const { itemId, lotNo, expiryDate, qtyOnHand } = req.body;
  const batch = await prisma.batch.create({
    data: {
      itemId: BigInt(itemId),
      lotNo: lotNo || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      qtyOnHand: qtyOnHand || 0
    },
  });
  res.status(201).json(batch);
});

r.get("/expiring", async (req, res) => {
  try {
    const windowDays = clampNumber(req.query.windowDays, { min: 1, max: 365, fallback: 30 });
    const take = clampNumber(req.query.take, { min: 1, max: 500, fallback: 100 });
    const now = new Date();
    const to = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const rows = await prisma.batch.findMany({
      where: {
        qtyOnHand: { gt: 0 },
        expiryDate: { not: null, gte: now, lte: to },
      },
      orderBy: { expiryDate: "asc" },
      take,
      include: {
        item: { select: { id: true, sku: true, name: true, unit: true, type: true } },
      },
    });

    res.json(
      rows.map((b) => ({
        id: b.id.toString(),
        itemId: b.itemId.toString(),
        lotNo: b.lotNo,
        expiryDate: b.expiryDate,
        qtyOnHand: b.qtyOnHand,
        item: b.item
          ? {
              id: b.item.id.toString(),
              sku: b.item.sku,
              name: b.item.name,
              unit: b.item.unit,
              type: b.item.type,
            }
          : null,
      }))
    );
  } catch (err) {
    console.error("[GET /batches/expiring]", err);
    res.status(500).json({ error: "Failed to load expiring batches" });
  }
});

module.exports = r;
