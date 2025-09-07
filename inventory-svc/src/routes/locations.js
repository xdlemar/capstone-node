const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const r = Router();

r.post("/", async (req, res) => {
  try {
    const { name, kind } = req.body || {};
    if (!name || !kind) return res.status(400).json({ error: "name and kind are required" });

    const loc = await prisma.location.create({ data: { name, kind } });
    res.status(201).json({
      id: loc.id.toString(),
      name: loc.name,
      kind: loc.kind,
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt,
    });
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Location name already exists" });
    }
    console.error("[POST /locations]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

r.get("/", async (_req, res) => {
  const rows = await prisma.location.findMany({ orderBy: [{ id: "asc" }] });
  res.json(
    rows.map((l) => ({
      id: l.id.toString(),
      name: l.name,
      kind: l.kind,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }))
  );
});

module.exports = r;
