const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const r = Router();

/**
 * POST /transfers
 * { transferNo, fromLocId, toLocId, notes?, lines: [{ itemId, qty, notes? }] }
 * FEFO per line; creates one StockMove per allocated batch.
 */
r.post("/", async (req, res) => {
  try {
    const { transferNo, fromLocId, toLocId, notes, lines = [] } = req.body || {};
    if (!transferNo || !fromLocId || !toLocId || !Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ error: "transferNo, fromLocId, toLocId, lines required" });
    }

    const created = await prisma.$transaction(async (p) => {
      const xfer = await p.transfer.create({
        data: {
          transferNo,
          fromLocId: BigInt(fromLocId),
          toLocId: BigInt(toLocId),
          notes: notes ?? null,
          lines: {
            create: lines.map(L => ({
              itemId: BigInt(L.itemId),
              qty: Number(L.qty),
              notes: L.notes ?? null,
            })),
          },
        },
        include: { lines: true },
      });

      for (const ln of xfer.lines) {
        let remaining = Number(ln.qty);
        if (remaining <= 0) continue;

        const batches = await p.batch.findMany({
          where: { itemId: ln.itemId },
          orderBy: [{ expiryDate: "asc" }, { id: "asc" }],
        });

        for (const b of batches) {
          if (remaining <= 0) break;
          const available = Number(b.qtyOnHand || 0);
          if (available <= 0) continue;

          const take = Math.min(available, remaining);

          await p.stockMove.create({
            data: {
              itemId: ln.itemId,
              batchId: b.id,
              fromLocId: xfer.fromLocId,
              toLocId: xfer.toLocId,
              qty: take,
              reason: "TRANSFER",
              refType: "TRANSFER",
              refId: xfer.id,
              eventId: `transfer:${xfer.transferNo}:${ln.id.toString()}:batch:${b.id.toString()}`,
              occurredAt: new Date(),
            },
          });

          // (optional) adjust batch.qtyOnHand here similarly to issues
          remaining -= take;
        }

        if (remaining > 0) {
          throw Object.assign(new Error("Insufficient stock for transfer"), { code: "FEFO_STOCK_OUT" });
        }
      }

      return xfer;
    });

    res.status(201).json({
      id: created.id.toString(),
      transferNo: created.transferNo,
      fromLocId: created.fromLocId.toString(),
      toLocId: created.toLocId.toString(),
      notes: created.notes,
      createdAt: created.createdAt,
      lines: created.lines.map(l => ({
        id: l.id.toString(),
        itemId: l.itemId.toString(),
        qty: l.qty,
        notes: l.notes,
      })),
    });
  } catch (err) {
    if (err?.code === "FEFO_STOCK_OUT") return res.status(409).json({ error: "Insufficient stock (FEFO)" });
    if (err?.code === "P2002") return res.status(409).json({ error: "Transfer number already exists" });
    if (err?.code === "P2003") return res.status(400).json({ error: "Invalid fromLocId/toLocId" });
    console.error("[POST /transfers]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
