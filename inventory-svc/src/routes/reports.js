const { Router } = require("express");
const { currentLevels } = require("../services/stock");
const { prisma } = require("../prisma");
const r = Router();

r.get("/levels", async (req, res) => {
  try {
    const locationId = req.query.locationId ? BigInt(String(req.query.locationId)) : undefined;
    const rows = await currentLevels(locationId);
    res.json(rows);
  } catch (e) {
    console.error("[GET /reports/levels] error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

r.get("/usage", async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await prisma.stockMove.findMany({
      where: {
        occurredAt: {
          gte: from ? new Date(String(from)) : undefined,
          lte: to ? new Date(String(to)) : undefined,
        },
      },
      orderBy: { occurredAt: "asc" },
    });
    res.json(rows);
  } catch (e) {
    console.error("[GET /reports/usage] error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
