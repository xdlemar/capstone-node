const { Router } = require("express");
const { prisma } = require("../prisma");

const r = Router();

r.get("/inventory", async (_req, res) => {
  try {
    const [items, locations] = await Promise.all([
      prisma.item.findMany({ orderBy: [{ name: "asc" }] }),
      prisma.location.findMany({ orderBy: [{ name: "asc" }] }),
    ]);

    res.json({
      items: items.map((item) => ({
        id: item.id.toString(),
        sku: item.sku,
        name: item.name,
        type: item.type,
        strength: item.strength,
        unit: item.unit,
        minQty: item.minQty ? Number(item.minQty) : 0,
      })),
      locations: locations.map((loc) => ({
        id: loc.id.toString(),
        name: loc.name,
        kind: loc.kind,
      })),
    });
  } catch (err) {
    console.error("[GET /lookups/inventory]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
