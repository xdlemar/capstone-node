const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

/**
 * POST /transfers
 * Body: {
 *   transferNo, fromLocId, toLocId, notes?,
 *   lines: [
 *     // either FEFO:
 *     { itemId, qty, notes? }
 *     // or explicit batch:
 *     { itemId, batchId, qty, notes? }
 *   ]
 * }
 */
r.post("/", async (req, res) => {
  try {
    const { transferNo, fromLocId, toLocId, notes, lines } = req.body;
    if (!transferNo || !fromLocId || !toLocId || !Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ error: "transferNo, fromLocId, toLocId, lines required" });
    }

    const created = await prisma.$transaction(async (p) => {
      const xfer = await p.transfer.create({
        data: {
          transferNo,
          fromLocId: BigInt(fromLocId),
          toLocId: BigInt(toLocId),
          notes: notes || null,
          lines: {
            create: lines.map(L => ({
              itemId: BigInt(L.itemId),
              qty: Number(L.qty),
              notes: L.notes || null,
            })),
          },
        },
        include: { lines: true },
      });

      for (const line of xfer.lines) {
        let remaining = Number(line.qty);
        let plans = [];

        // explicit batch?
        const provided = lines.find(L => L.itemId === Number(line.itemId) && L.batchId);
        if (provided?.batchId) {
          plans.push({ batchId: BigInt(provided.batchId), canUse: remaining });
        } else {
          // FEFO at fromLoc
          const batches = await p.$queryRawUnsafe(`
            SELECT b.id AS "batchId", b."expiryDate",
                   COALESCE(SUM(CASE WHEN sm."toLocId"   = $1 AND sm."batchId"=b.id THEN sm.qty END), 0) -
                   COALESCE(SUM(CASE WHEN sm."fromLocId" = $1 AND sm."batchId"=b.id THEN sm.qty END), 0) AS onhand
            FROM "Batch" b
            LEFT JOIN "StockMove" sm ON sm."batchId" = b.id AND sm."itemId" = $2
            WHERE b."itemId" = $2
            GROUP BY b.id
            HAVING COALESCE(SUM(CASE WHEN sm."toLocId"   = $1 AND sm."batchId"=b.id THEN sm.qty END), 0) -
                   COALESCE(SUM(CASE WHEN sm."fromLocId" = $1 AND sm."batchId"=b.id THEN sm.qty END), 0) > 0
            ORDER BY b."expiryDate" NULLS LAST, b.id
          `, xfer.fromLocId, line.itemId);

          for (const b of batches) {
            if (remaining <= 0) break;
            const use = Math.min(Number(b.onhand), remaining);
            plans.push({ batchId: b.batchId, canUse: use });
            remaining -= use;
          }
        }

        for (const pl of plans) {
          if (pl.canUse <= 0) continue;
          const ev = `xfer:${Number(xfer.id)}:${Number(line.id)}:${Number(pl.batchId)}`;
          await p.stockMove.create({
            data: {
              itemId: line.itemId,
              batchId: pl.batchId,
              fromLocId: xfer.fromLocId,
              qty: pl.canUse,
              reason: "TRANSFER",
              refType: "TRANSFER",
              refId: xfer.id,
              eventId: `${ev}:out`,
            },
          });
          await p.stockMove.create({
            data: {
              itemId: line.itemId,
              batchId: pl.batchId,
              toLocId: xfer.toLocId,
              qty: pl.canUse,
              reason: "TRANSFER",
              refType: "TRANSFER",
              refId: xfer.id,
              eventId: `${ev}:in`,
            },
          });
        }
      }

      return await p.transfer.findUnique({
        where: { id: xfer.id },
        include: { lines: true },
      });
    });

    res.status(201).json(created);
  } catch (e) {
    console.error("[POST /transfers]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
