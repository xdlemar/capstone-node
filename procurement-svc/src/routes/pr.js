const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

r.post("/", async (req, res) => {
  try {
    const { prNo, notes, lines } = req.body;
    if (!prNo) return res.status(400).json({ error: "prNo required" });
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: "lines required" });
    }

    const existing = await prisma.pR.findUnique({ where: { prNo } });

    const data = {
      prNo,
      notes: notes || null,
      status: "SUBMITTED",
      lines: {
        deleteMany: existing ? { prId: existing.id } : undefined,
        create: lines.map(l => ({
          itemId: BigInt(l.itemId),
          qty: Number(l.qty),
          unit: String(l.unit || "unit"),
          notes: l.notes || null,
        })),
      },
    };

    const pr = existing
      ? await prisma.pR.update({ where: { id: existing.id }, data, include: { lines: true } })
      : await prisma.pR.create({ data, include: { lines: true } });

    res.status(existing ? 200 : 201).json(pr);
  } catch (e) {
    console.error("[POST /pr]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

r.post("/:prNo/approve", async (req, res) => {
  try {
    const { prNo } = req.params;
    const pr = await prisma.pR.update({
      where: { prNo },
      data: { status: "APPROVED" },
      include: { lines: true },
    });
    res.json(pr);
  } catch (e) {
    console.error("[POST /pr/:prNo/approve]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

r.get("/", async (_req, res) => {
  try {
    const rows = await prisma.pR.findMany({
      include: { lines: true },
      orderBy: { id: "desc" },
    });
    res.json(rows);
  } catch (e) {
    console.error("[GET /pr]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
