const { Router } = require("express");
const { prisma } = require("../prisma");
const { recordStockMove } = require("../services/stockMove");
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
        status: { notIn: ["EXPIRED", "QUARANTINED", "DISPOSED"] },
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

r.post("/:id/quarantine", async (req, res) => {
  try {
    const batchId = BigInt(req.params.id);
    const { fromLocId, qty } = req.body || {};
    if (!fromLocId) return res.status(400).json({ error: "fromLocId is required" });

    const fromLocIdBig = BigInt(fromLocId);
    const batch = await prisma.batch.findUnique({ where: { id: batchId }, include: { item: true } });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const moveQty = qty ? Number(qty) : Number(batch.qtyOnHand || 0);
    if (!Number.isFinite(moveQty) || moveQty <= 0) {
      return res.status(400).json({ error: "qty must be positive" });
    }

    const holdName = process.env.EXPIRED_HOLD_LOCATION || "Hold/Expired";
    let holdLoc = await prisma.location.findUnique({ where: { name: holdName } });
    if (!holdLoc) {
      holdLoc = await prisma.location.create({
        data: { name: holdName, kind: "HOLD" },
      });
    }

    await recordStockMove({
      itemId: batch.itemId,
      qty: moveQty,
      reason: "QUARANTINE",
      refType: "BATCH",
      refId: batch.id,
      eventId: `quarantine:${batch.id.toString()}:${Date.now()}`,
      fromLocId: fromLocIdBig,
      toLocId: holdLoc.id,
      batchId: batch.id,
    });

    const updated = await prisma.batch.update({
      where: { id: batch.id },
      data: { status: "QUARANTINED", quarantinedAt: new Date() },
    });

    res.json({
      id: updated.id.toString(),
      status: updated.status,
      quarantinedAt: updated.quarantinedAt,
      holdLocationId: holdLoc.id.toString(),
      holdLocationName: holdLoc.name,
    });
  } catch (err) {
    console.error("[POST /batches/:id/quarantine]", err);
    res.status(500).json({ error: "Failed to quarantine batch" });
  }
});

r.get("/flagged", async (req, res) => {
  try {
    const rawStatuses = String(req.query.statuses || "EXPIRED,QUARANTINED").split(",");
    const statuses = rawStatuses.map((s) => s.trim().toUpperCase()).filter(Boolean);
    const take = clampNumber(req.query.take, { min: 1, max: 500, fallback: 200 });

    const rows = await prisma.batch.findMany({
      where: {
        qtyOnHand: { gt: 0 },
        status: { in: statuses },
      },
      orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
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
        status: b.status,
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
    console.error("[GET /batches/flagged]", err);
    res.status(500).json({ error: "Failed to load flagged batches" });
  }
});

module.exports = r;
