const { Router } = require("express");
const { prisma } = require("../prisma");
const { recordStockMove } = require("../services/stockMove");

const r = Router();

function parseBigInt(value, field, { optional = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    throw Object.assign(new Error(`${field} is required`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  try {
    return BigInt(value);
  } catch {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
}

function parseQty(value, field) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw Object.assign(new Error(`${field} must be positive`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  return {
    number: numeric,
    decimal: typeof value === "string" ? value : numeric.toString(),
  };
}

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

    const fromLocIdBig = parseBigInt(fromLocId, "fromLocId");
    const toLocIdBig = parseBigInt(toLocId, "toLocId");

    const normalizedLines = lines.map((ln, idx) => {
      const lineNo = idx + 1;
      const itemId = parseBigInt(ln.itemId, `lines[${lineNo}].itemId`);
      const qty = parseQty(ln.qty, `lines[${lineNo}].qty`);
      return {
        itemId,
        qtyNumber: qty.number,
        qtyDecimal: qty.decimal,
        notes: ln.notes ?? null,
      };
    });

    const created = await prisma.$transaction(async (p) => {
      const xfer = await p.transfer.create({
        data: {
          transferNo,
          fromLocId: fromLocIdBig,
          toLocId: toLocIdBig,
          notes: notes ?? null,
          lines: {
            create: normalizedLines.map((ln) => ({
              itemId: ln.itemId,
              qty: ln.qtyDecimal,
              notes: ln.notes,
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
          select: { id: true, qtyOnHand: true },
        });

        for (const b of batches) {
          if (remaining <= 0) break;
          const available = Number(b.qtyOnHand || 0);
          if (available <= 0) continue;

          const take = Math.min(available, remaining);

          await recordStockMove({
            itemId: ln.itemId,
            qty: take,
            reason: "TRANSFER",
            refType: "TRANSFER",
            refId: xfer.id,
            eventId: `transfer:${xfer.transferNo}:${ln.id.toString()}:batch:${b.id.toString()}`,
            fromLocId: xfer.fromLocId,
            toLocId: xfer.toLocId,
            batchId: b.id,
          });

          remaining -= take;
        }

        if (remaining > 0) {
          const err = Object.assign(new Error("Insufficient stock for transfer"), {
            code: "FEFO_STOCK_OUT",
            status: 409,
          });
          throw err;
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
      lines: created.lines.map((l) => ({
        id: l.id.toString(),
        itemId: l.itemId.toString(),
        qty: Number(l.qty),
        notes: l.notes,
      })),
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    if (err?.code === "FEFO_STOCK_OUT") return res.status(409).json({ error: "Insufficient stock (FEFO)" });
    if (err?.code === "P2002") return res.status(409).json({ error: "Transfer number already exists" });
    if (err?.code === "P2003") return res.status(400).json({ error: "Invalid fromLocId/toLocId" });
    console.error("[POST /transfers]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;


