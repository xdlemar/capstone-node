const { Router } = require("express");
const prisma = require("../prisma.js");
const { requireRole } = require("../auth");

const router = Router();
const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

function normalizePoNo(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

router.get("/by-po/:poNo", staffAccess, async (req, res) => {
  try {
    const poNo = normalizePoNo(req.params.poNo);
    if (!poNo) return res.status(400).json({ error: "poNo is required" });

    const po = await prisma.pO.findUnique({
      where: { poNo },
      include: {
        vendorReceipt: {
          include: { lines: true },
        },
      },
    });

    if (!po) return res.status(404).json({ error: "PO not found" });
    if (!po.vendorReceipt) return res.json({ receipt: null });

    res.json({
      receipt: {
        id: po.vendorReceipt.id.toString(),
        poId: po.vendorReceipt.poId.toString(),
        createdBy: po.vendorReceipt.createdBy ?? null,
        createdAt: po.vendorReceipt.createdAt,
        updatedAt: po.vendorReceipt.updatedAt,
      },
      lines: po.vendorReceipt.lines.map((line) => ({
        id: line.id.toString(),
        itemId: line.itemId.toString(),
        qty: line.qty,
        lotNo: line.lotNo,
        expiryDate: line.expiryDate,
      })),
    });
  } catch (err) {
    console.error("[GET /vendor-receipts/by-po/:poNo]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
