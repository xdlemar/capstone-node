const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const { requireRole } = require("../auth");

const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

// POST /attachments
router.post("/attachments", staffAccess, async (req, res) => {
  try {
    const { targetType, targetNo, kind, fileName, storageKey, mimeType, size } = req.body || {};
    if (!targetType || !targetNo || !kind) {
      return res.status(400).json({ error: "targetType, targetNo, kind required" });
    }

    let po = null;
    let rcpt = null;

    if (targetType === "PO") {
      po = await prisma.pO.findUnique({ where: { poNo: targetNo } }); // NOTE: pO (Prisma Pascalizes)
      if (!po) return res.status(404).json({ error: "PO not found" });

      // If kind=DR and caller didn't send fileName, try to infer the latest DR number
      if (!fileName && String(kind).toUpperCase() === "DR") {
        rcpt = await prisma.receipt.findFirst({
          where: { poId: po.id },
          orderBy: { createdAt: "desc" },
          select: { drNo: true },
        });
      }
    } else if (targetType === "RECEIPT") {
      rcpt = await prisma.receipt.findUnique({
        where: { id: BigInt(targetNo) }, // or use a different key if you pass receiptNo
      });
      if (!rcpt) return res.status(404).json({ error: "Receipt not found" });
      // Make sure we also know which PO it belongs to (for default storageKey path)
      po = await prisma.pO.findUnique({ where: { id: rcpt.poId } });
    } else {
      return res.status(400).json({ error: "Unsupported targetType (use PO or RECEIPT)" });
    }

    // Derive sane defaults
    const inferredDR = rcpt?.drNo?.trim() || null;
    const file = fileName
      ? fileName
      : inferredDR
      ? `${inferredDR}.pdf`
      : "ATT.pdf";

    const key = storageKey || `receipts/${targetNo}/${file}`;

    const att = await prisma.attachment.create({
      data: {
        kind,
        fileName: file,
        storageKey: key,
        mimeType: mimeType || null,
        size: size || null,
        poId: po ? po.id : null,
        receiptId: rcpt ? rcpt.id : null,
      },
    });

    return res.status(201).json(att);
  } catch (err) {
    console.error("[/attachments] error", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

router.get("/attachments", staffAccess, async (req, res) => {
  try {
    const { poNo } = req.query || {};
    if (!poNo) return res.status(400).json({ error: "poNo required" });

    // NOTE: model is `PO` -> Prisma client accessor is `pO`
    const po = await prisma.pO.findUnique({ where: { poNo } });
    if (!po) return res.status(404).json({ error: "PO not found" });

    const list = await prisma.attachment.findMany({ where: { poId: po.id } });
    res.json(list);
  } catch (err) {
    console.error("[GET /attachments] error", err);
    res.status(500).json({ error: "Internal error" });
  }
});
module.exports = router;
