const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");

function toBigInt(value, field) {
  if (value === undefined || value === null || value === "") {
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

function normalizePoNo(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function normalizeString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function toDate(value, field) {
  if (value === undefined || value === null || value === "") {
    throw Object.assign(new Error(`${field} is required`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  return dt;
}

router.get("/po/:id/approval", async (req, res) => {
  try {
    const poId = toBigInt(req.params.id, "id");
    const po = await prisma.pO.findUnique({
      where: { id: poId },
      select: {
        id: true,
        poNo: true,
        vendorId: true,
        vendorAcknowledgedAt: true,
        vendorAcknowledgedBy: true,
        vendorNote: true,
      },
    });

    if (!po) return res.status(404).json({ error: "PO not found" });

    res.json({
      id: po.id.toString(),
      poNo: po.poNo,
      vendorId: po.vendorId?.toString() ?? null,
      vendorAcknowledgedAt: po.vendorAcknowledgedAt,
      vendorAcknowledgedBy: po.vendorAcknowledgedBy,
      vendorNote: po.vendorNote,
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    console.error("[internal] GET /po/:id/approval", err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/po/by-no/:poNo/approval", async (req, res) => {
  try {
    const poNo = normalizePoNo(req.params.poNo);
    if (!poNo) return res.status(400).json({ error: "poNo is required" });

    const po = await prisma.pO.findUnique({
      where: { poNo },
      select: {
        id: true,
        poNo: true,
        vendorId: true,
        vendorAcknowledgedAt: true,
        vendorAcknowledgedBy: true,
        vendorNote: true,
      },
    });

    if (!po) return res.status(404).json({ error: "PO not found" });

    res.json({
      id: po.id.toString(),
      poNo: po.poNo,
      vendorId: po.vendorId?.toString() ?? null,
      vendorAcknowledgedAt: po.vendorAcknowledgedAt,
      vendorAcknowledgedBy: po.vendorAcknowledgedBy,
      vendorNote: po.vendorNote,
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    console.error("[internal] GET /po/by-no/:poNo/approval", err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/vendor-receipts", async (req, res) => {
  try {
    const poId = toBigInt(req.body?.poId, "poId");
    const vendorId = req.body?.vendorId ? toBigInt(req.body.vendorId, "vendorId") : null;
    const createdBy = normalizeString(req.body?.createdBy);
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];

    if (!lines.length) {
      return res.status(400).json({ error: "lines are required" });
    }

    const po = await prisma.pO.findUnique({
      where: { id: poId },
      include: { lines: true },
    });

    if (!po) return res.status(404).json({ error: "PO not found" });
    if (vendorId && po.vendorId !== vendorId) {
      return res.status(403).json({ error: "PO not assigned to vendor" });
    }

    const poItemIds = new Set(po.lines.map((line) => line.itemId.toString()));

    const normalizedLines = lines.map((line, idx) => {
      const lineNo = idx + 1;
      const itemId = toBigInt(line.itemId, `lines[${lineNo}].itemId`);
      if (!poItemIds.has(itemId.toString())) {
        throw Object.assign(new Error(`lines[${lineNo}].itemId not in PO`), {
          status: 400,
          code: "VALIDATION_ERROR",
        });
      }
      const qtyNumber = typeof line.qty === "number" ? line.qty : Number(line.qty);
      if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
        throw Object.assign(new Error(`lines[${lineNo}].qty must be positive`), {
          status: 400,
          code: "VALIDATION_ERROR",
        });
      }
      const lotNo = normalizeString(line.lotNo);
      if (!lotNo) {
        throw Object.assign(new Error(`lines[${lineNo}].lotNo is required`), {
          status: 400,
          code: "VALIDATION_ERROR",
        });
      }
      const expiryDate = toDate(line.expiryDate, `lines[${lineNo}].expiryDate`);

      return {
        itemId,
        qty: qtyNumber,
        lotNo,
        expiryDate,
      };
    });

    const receipt = await prisma.vendorReceipt.upsert({
      where: { poId },
      create: {
        poId,
        createdBy,
        lines: { create: normalizedLines },
      },
      update: {
        ...(createdBy ? { createdBy } : {}),
        lines: { deleteMany: {}, create: normalizedLines },
      },
      include: { lines: true },
    });

    res.json({
      receipt: {
        id: receipt.id.toString(),
        poId: receipt.poId.toString(),
        createdBy: receipt.createdBy ?? null,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt,
      },
      lines: receipt.lines.map((line) => ({
        id: line.id.toString(),
        itemId: line.itemId.toString(),
        qty: line.qty,
        lotNo: line.lotNo,
        expiryDate: line.expiryDate,
      })),
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    if (err?.status === 403) return res.status(403).json({ error: err.message });
    console.error("[internal] POST /vendor-receipts", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
