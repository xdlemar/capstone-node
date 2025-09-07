const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");

// POST /pr  { prNo, notes, lines: [{ itemId, qty, unit, notes? }] }
router.post("/pr", async (req, res) => {
  try {
    const { prNo, notes, lines = [] } = req.body;
    if (!prNo) return res.status(400).json({ error: "prNo required" });

    const created = await prisma.pR.create({
      data: {
        prNo,
        status: "SUBMITTED",
        notes: notes || null,
        lines: {
          create: lines.map(l => ({
            itemId: BigInt(l.itemId),
            qty: l.qty,
            unit: l.unit || "",
            notes: l.notes || null,
          })),
        },
      },
      include: { lines: true },
    });

    res.json(created);
  } catch (err) {
    if (err?.code === "P2002") return res.status(409).json({ error: "PR number already exists" });
    console.error("[/pr] error", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /pr/:no/approve
router.post("/pr/:no/approve", async (req, res) => {
  try {
    const { no } = req.params;
    const pr = await prisma.pR.update({
      where: { prNo: no },
      data: { status: "APPROVED" },
      include: { lines: true },
    });
    res.json(pr);
  } catch (err) {
    if (err?.code === "P2025") return res.status(404).json({ error: "PR not found" });
    console.error("[/pr/:no/approve] error", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
