const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

/**
 * Body: { poNo, prNo?, vendorName, lines:[{itemId, qty, unit, price?}] }
 */
r.post("/", async (req, res) => {
  try {
    const { poNo, prNo, vendorName, lines } = req.body;
    if (!poNo || !vendorName) return res.status(400).json({ error: "poNo and vendorName required" });
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: "lines required" });

    const vendor = await prisma.vendor.upsert({
      where: { name: vendorName },
      update: {},
      create: { name: vendorName },
    });

    const existing = await prisma.pO.findUnique({ where: { poNo } });

    const pr = prNo ? await prisma.pR.findUnique({ where: { prNo } }) : null;

    const data = {
      poNo,
      vendorId: vendor.id,
      prId: pr ? pr.id : null,
      status: "OPEN",
      lines: {
        deleteMany: existing ? { poId: existing.id } : undefined,
        create: lines.map(l => ({
          itemId: BigInt(l.itemId),
          qty: Number(l.qty),
          unit: String(l.unit || "unit"),
          price: l.price ? String(l.price) : "0",
          notes: l.notes || null,
        })),
      },
    };

    const po = existing
      ? await prisma.pO.update({ where: { id: existing.id }, data, include: { lines: true, vendor: true } })
      : await prisma.pO.create({ data, include: { lines: true, vendor: true } });

    res.status(existing ? 200 : 201).json(po);
  } catch (e) {
    console.error("[POST /po]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

r.get("/", async (_req, res) => {
  try {
    const rows = await prisma.pO.findMany({
      include: { lines: true, vendor: true },
      orderBy: { id: "desc" },
    });
    res.json(rows);
  } catch (e) {
    console.error("[GET /po]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
