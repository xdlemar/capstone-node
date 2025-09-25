const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const { requireRole } = require("../auth");

const managerAccess = requireRole("MANAGER", "ADMIN");

// Create PO from PR
router.post("/po", managerAccess, async (req, res) => {
  try {
    const { poNo, prNo } = req.body || {};
    if (!poNo || !prNo) return res.status(400).json({ error: "poNo, prNo required" });

    const pr = await prisma.pR.findUnique({
      where: { prNo },
      include: { lines: true },
    });
    if (!pr) return res.status(404).json({ error: "PR not found" });

    // choose a vendor (you already upserted MedSupply with id 1)
    const vendorId = BigInt(1);

    const po = await prisma.pO.upsert({
      where: { poNo },
      update: {},
      create: {
        poNo,
        status: "OPEN",
        prId: pr.id,
        vendorId,
        lines: {
          create: pr.lines.map((l) => ({
            itemId: l.itemId,
            qty: l.qty,
            unit: l.unit || "",
            price: 0,
          })),
        },
      },
      include: { lines: true, vendor: true },
    });

    res.json(po);
  } catch (err) {
    console.error("[/po] error", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
