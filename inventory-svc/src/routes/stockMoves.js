const { Router } = require("express");
const { prisma } = require("../prisma");

const r = Router();

/**
 * POST /stock-moves
 * Body: {
 *   itemId, qty, reason, refType?, refId?, eventId?,
 *   fromLocId?, toLocId?,
 *   lotNo?, expiryDate?
 * }
 *
 * - If toLocId is set (receipt/transfer-in), we will upsert a Batch by (itemId, lotNo, expiryDate)
 *   and increment its qtyOnHand.
 * - If fromLocId is set (issue/adjust-out), we decrement from the most appropriate batch (if provided),
 *   otherwise just write the move without touching Batch (simple mode for now).
 */
r.post("/", async (req, res) => {
  try {
    const {
      itemId,
      qty,
      reason,
      refType,
      refId,
      eventId,
      fromLocId,
      toLocId,
      lotNo,
      expiryDate,
    } = req.body;

    if (!itemId || !qty || !reason) {
      return res.status(400).json({ error: "itemId, qty, reason are required" });
    }

    const dataMove = {
      itemId: BigInt(itemId),
      qty: String(qty), // Decimal
      reason: String(reason),
      refType: refType || null,
      refId: refId != null ? BigInt(refId) : null,
      eventId: eventId || null,
      fromLocId: fromLocId != null ? BigInt(fromLocId) : null,
      toLocId: toLocId != null ? BigInt(toLocId) : null,
      batchId: null,
      occurredAt: new Date(),
    };

    const created = await prisma.$transaction(async (p) => {
      let batch = null;

      // Receipt / IN → create or reuse batch, then add qtyOnHand
      const isInbound = !!toLocId && !fromLocId && Number(qty) > 0;
      if (isInbound) {
        const batchWhere = {
          itemId: BigInt(itemId),
          lotNo: lotNo || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        };

        // Find or create the batch
        batch = await p.batch.findFirst({ where: batchWhere });
        if (!batch) {
          batch = await p.batch.create({
            data: {
              itemId: batchWhere.itemId,
              lotNo: batchWhere.lotNo,
              expiryDate: batchWhere.expiryDate,
              qtyOnHand: String(0),
            },
          });
        }

        // increment qtyOnHand
        await p.batch.update({
          where: { id: batch.id },
          data: { qtyOnHand: { increment: String(qty) } },
        });

        dataMove.batchId = batch.id;
      }

      const move = await p.stockMove.create({ data: dataMove });

      return move;
    });

    res.status(201).json(created);
  } catch (e) {
    console.error("[POST /stock-moves]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
