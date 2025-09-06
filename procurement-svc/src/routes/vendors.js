const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

r.post("/", async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });

    const existing = await prisma.vendor.findUnique({ where: { name } });
    const data = { name, email, phone, address };
    const vendor = existing
      ? await prisma.vendor.update({ where: { id: existing.id }, data })
      : await prisma.vendor.create({ data });

    res.status(existing ? 200 : 201).json(vendor);
  } catch (e) {
    console.error("[POST /vendors]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

r.get("/", async (_req, res) => {
  try {
    const rows = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
    res.json(rows);
  } catch (e) {
    console.error("[GET /vendors]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
