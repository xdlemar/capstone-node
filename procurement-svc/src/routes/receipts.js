const { Router } = require("express");
const { prisma } = require("../prisma");
const { postStockMove } = require("../inventoryClient");
const r = Router();

/**
 * Body: {
 *   poNo, drNo?, invoiceNo?, receivedAt?,
 *   lines: [{ itemId, toLocId, qty, lotNo?, expiryDate? }]
 * }
 */
r.post("/", async (req, res) => {
  try {
    const { poNo, drNo, invoiceNo, receivedAt, lines } = req.body;
    if (!poNo) return res.status(400).json({ error: "poNo required" });
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: "lines required" });

    const po = await prisma.pO.findUnique({ where: { poNo }, include: { lines: true } });
    if (!po) return res.status(404).json({ error: "PO not found" });

    const result = await prisma.$transaction(async (p) => {
      const receipt = await p.receipt.create({
        data: {
          poId: po.id,
          drNo: drNo || null,
          invoiceNo: invoiceNo || null,
          receivedAt: receivedAt ? new Date(receivedAt) : undefined,
          lines: {
            create: lines.map(l => ({
              itemId: BigInt(l.itemId),
              toLocId: BigInt(l.toLocId),
              qty: Number(l.qty),
              lotNo: l.lotNo || null,
              expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
            })),
          },
        },
        include: { lines: true },
      });

      // push stock moves to inventory for each line
      for (const L of receipt.lines) {
        await postStockMove({
          itemId: Number(L.itemId),
          toLocId: Number(L.toLocId),
          qty: Number(L.qty),
          reason: "RECEIPT",
          refType: "PO",
          refId: Number(po.id),
          eventId: `rcpt:${Number(receipt.id)}:${Number(L.id)}`,
        });
      }

      // recompute PO status
      const allReceipts = await p.receiptLine.groupBy({
  by: ["itemId"],
  where: { Receipt: { poId: po.id } },   
  _sum: { qty: true },
});

let fullyReceived = true;
let anyReceived = false;
for (const line of po.lines) {
  const got = allReceipts.find(r => r.itemId === line.itemId)?._sum.qty || 0;
  if (got > 0) anyReceived = true;
  if (got < line.qty) fullyReceived = false;
}
const newStatus = fullyReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : "OPEN";
const poUpd = await p.pO.update({ where: { id: po.id }, data: { status: newStatus } });

      return { receipt, po: poUpd };
    });

    res.status(201).json(result);
  } catch (e) {
    console.error("[POST /receipts]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
