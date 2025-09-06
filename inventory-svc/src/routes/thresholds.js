const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

/**
 * Set or update a threshold.
 * Body: { itemId, locationId (optional), minQty }
 * If locationId is null, acts as a global threshold for that item.
 */
r.post("/", async (req, res) => {
  try {
    const itemId = BigInt(req.body.itemId);
    const locationId = req.body.locationId != null ? BigInt(req.body.locationId) : null;
    const minQty = Number(req.body.minQty);

    // Upsert by (itemId, locationId) logical key
    // If you didn't define a composite unique, we emulate with findFirst+create/update.
    const existing = await prisma.threshold.findFirst({ where: { itemId, locationId } });
    const data = { itemId, locationId, minQty };

    let row;
    if (existing) {
      row = await prisma.threshold.update({ where: { id: existing.id }, data });
      return res.status(200).json(row);
    } else {
      row = await prisma.threshold.create({ data });
      return res.status(201).json(row);
    }
  } catch (e) {
    console.error("[POST /thresholds] error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

r.get("/", async (_req, res) => {
  try {
    const rows = await prisma.threshold.findMany({ orderBy: [{ itemId: "asc" }] });
    res.json(rows);
  } catch (e) {
    console.error("[GET /thresholds] error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
