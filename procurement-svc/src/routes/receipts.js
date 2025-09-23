const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const { postStockMove } = require("../inventoryClient");

// POST /receipts
router.post("/receipts", async (req, res) => {
  try {
    const { poNo, drNo, invoiceNo, lines = [] } = req.body || {};
    if (!poNo) return res.status(400).json({ error: "poNo required" });

    const po = await prisma.pO.findUnique({ where: { poNo } });
    if (!po) return res.status(404).json({ error: "PO not found" });

    const receipt = await prisma.$transaction(async tx => {
      const created = await tx.receipt.create({
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

      await Promise.all(
        created.lines.map(line =>
          postStockMove({
            itemId: line.itemId.toString(),
            qty: String(line.qty),
            toLocId: line.toLocId.toString(),
            lotNo: line.lotNo ?? null,
            expiryDate: line.expiryDate ? line.expiryDate.toISOString() : null,
            eventId: `receipt:${created.id}:${line.id}`,
            reason: "RECEIPT",
            refType: "receipt",
            refId: created.id.toString(),
          })
        )
      );

      return created;
    });

    res.status(201).json({ receipt });
  } catch (err) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Duplicate DR for this PO" });
    if (err?.message?.startsWith("[inventoryClient]")) {
      return res.status(502).json({ error: "Failed to post stock moves" });
    }
    console.error("[/receipts] error", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
