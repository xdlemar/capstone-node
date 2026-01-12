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

module.exports = router;
