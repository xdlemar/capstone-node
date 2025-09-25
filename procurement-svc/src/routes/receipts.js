const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const { postStockMove } = require("../inventoryClient");
const { requireRole } = require("../auth");

const DEFAULT_RECEIPT_LOC_ID = process.env.DEFAULT_RECEIPT_LOC_ID || "1";
const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

function toBigInt(val, field) {
  if (val === undefined || val === null || val === "") {
    throw Object.assign(new Error(`${field} is required`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  try {
    return BigInt(val);
  } catch {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
}

function toDate(val, field) {
  if (val === undefined || val === null || val === "") {
    return null;
  }
  const dt = new Date(val);
  if (Number.isNaN(dt.getTime())) {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  return dt;
}

// POST /receipts
router.post("/receipts", staffAccess, async (req, res) => {
  try {
    const { poNo, drNo, invoiceNo, lines } = req.body || {};
    if (!poNo) return res.status(400).json({ error: "poNo required" });

    const po = await prisma.pO.findUnique({
      where: { poNo },
      include: { lines: true },
    });
    if (!po) return res.status(404).json({ error: "PO not found" });

    const inputLines = Array.isArray(lines) ? lines : [];
    const defaultLocId = toBigInt(DEFAULT_RECEIPT_LOC_ID, "DEFAULT_RECEIPT_LOC_ID");

    const normalizedLines = inputLines.length
      ? inputLines.map((l, idx) => {
          const lineNo = idx + 1;
          const itemId = toBigInt(l.itemId, `lines[${lineNo}].itemId`);
          const toLocId = toBigInt(l.toLocId ?? defaultLocId, `lines[${lineNo}].toLocId`);
          const qtyNumber = typeof l.qty === "number" ? l.qty : Number(l.qty);
          if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
            throw Object.assign(new Error(`lines[${lineNo}].qty must be positive`), {
              status: 400,
              code: "VALIDATION_ERROR",
            });
          }
          return {
            itemId,
            toLocId,
            qty: qtyNumber,
            lotNo: l.lotNo || null,
            expiryDate: toDate(l.expiryDate, `lines[${lineNo}].expiryDate`),
          };
        })
      : (() => {
          if (!po.lines.length) {
            throw Object.assign(new Error("PO has no lines to receive"), {
              status: 400,
              code: "VALIDATION_ERROR",
            });
          }
          return po.lines.map((line) => ({
            itemId: BigInt(line.itemId),
            toLocId: defaultLocId,
            qty: Number(line.qty),
            lotNo: null,
            expiryDate: null,
          }));
        })();

    const receipt = await prisma.receipt.create({
      data: {
        poId: po.id,
        drNo: drNo || null,
        invoiceNo: invoiceNo || null,
        lines: {
          create: normalizedLines.map((line) => ({
            itemId: line.itemId,
            toLocId: line.toLocId,
            qty: line.qty,
            lotNo: line.lotNo,
            expiryDate: line.expiryDate,
          })),
        },
      },
      include: { lines: true },
    });

    try {
      for (const line of receipt.lines) {
        await postStockMove({
          itemId: line.itemId.toString(),
          qty: line.qty.toString(),
          reason: "RECEIPT",
          refType: "RECEIPT",
          refId: receipt.id.toString(),
          eventId: `receipt:${receipt.id.toString()}:${line.id.toString()}`,
          toLocId: line.toLocId.toString(),
          lotNo: line.lotNo,
          expiryDate: line.expiryDate ? line.expiryDate.toISOString() : null,
        });
      }
    } catch (syncErr) {
      await prisma.receipt.delete({ where: { id: receipt.id } }).catch(() => {});
      throw Object.assign(new Error("Failed to sync inventory"), {
        status: 502,
        cause: syncErr,
      });
    }

    res.status(201).json({ receipt });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    if (err?.status === 502) {
      console.error("[/receipts] inventory sync failure", err.cause || err);
      return res.status(502).json({ error: err.message });
    }
    if (err?.code === "P2002") return res.status(409).json({ error: "Duplicate DR for this PO" });
    console.error("[/receipts] error", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
