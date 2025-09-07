const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");

// POST /receipts
router.post("/receipts", async (req, res) => {
  try {
    const { poNo, drNo, invoiceNo, lines = [] } = req.body || {};
    if (!poNo) return res.status(400).json({ error: "poNo required" });

    const po = await prisma.pO.findUnique({ where: { poNo } });
    if (!po) return res.status(404).json({ error: "PO not found" });

    const receipt = await prisma.receipt.create({
      data: {
        poId: po.id,
        drNo: drNo || null,
        invoiceNo: invoiceNo || null,
        lines: {
          create: lines.map(l => ({
            itemId: BigInt(l.itemId),
            toLocId: BigInt(l.toLocId),
            qty: l.qty,
            lotNo: l.lotNo || null,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
          })),
        },
      },
      include: { lines: true },
    });

    res.status(201).json({ receipt });
  } catch (err) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Duplicate DR for this PO" });
    console.error("[/receipts] error", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
