const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const { postStockMove, fetchInventoryItems } = require("../inventoryClient");
const { createDocument } = require("../dtrsClient");
const { requireRole } = require("../auth");

const DEFAULT_RECEIPT_LOC_ID = process.env.DEFAULT_RECEIPT_LOC_ID || "1";
const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

function formatDateYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

async function getLotSeqMap(itemIds, date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const seqMap = new Map();

  for (const itemId of itemIds) {
    const count = await prisma.receiptLine.count({
      where: {
        itemId,
        Receipt: {
          receivedAt: { gte: start, lt: end },
        },
      },
    });
    seqMap.set(itemId.toString(), count + 1);
  }

  return { seqMap, dateStr: formatDateYYYYMMDD(date) };
}

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

async function createReceiptDocuments({ po, receipt }) {
  if (!receipt || (!receipt.drNo && !receipt.invoiceNo)) {
    return { drCreated: false, invoiceCreated: false };
  }

  const vendorName = po?.vendor?.name || "Unknown vendor";
  const vendorLabel = vendorName !== "Unknown vendor" ? vendorName : null;
  const lineCount = receipt.lines?.length || 0;
  const totalQty = (receipt.lines || []).reduce((sum, line) => sum + Number(line.qty || 0), 0);

  let itemMap = new Map();
  try {
    const items = await fetchInventoryItems();
    itemMap = new Map(items.map((item) => [String(item.id), item]));
  } catch (err) {
    console.warn("[/receipts] inventory lookup failed for DTRS notes", err.message);
    itemMap = new Map();
  }

  const poUnitMap = new Map(
    (po?.lines || []).map((line) => [line.itemId.toString(), line.unit])
  );

  const linePreview = (receipt.lines || [])
    .slice(0, 8)
    .map((line, index) => {
      const item = itemMap.get(line.itemId.toString());
      const name = item?.name || `Item #${line.itemId.toString()}`;
      const sku = item?.sku ? ` (${item.sku})` : "";
      const unit = poUnitMap.get(line.itemId.toString()) || item?.unit || "";
      const unitText = unit ? ` ${unit}` : "";
      return `${index + 1}. ${name}${sku} - ${line.qty}${unitText}`;
    })
    .join("\n");
  const lineSuffix = lineCount > 8 ? `+ ${lineCount - 8} more line(s)` : null;

  const baseNotes = [
    "Auto-recorded from Receiving.",
    `PO: ${po.poNo}`,
    `Vendor: ${vendorName}`,
    po.orderedAt ? `Ordered at: ${po.orderedAt.toISOString()}` : null,
    `Receipt ID: ${receipt.id.toString()}`,
    `Received at: ${receipt.receivedAt.toISOString()}`,
    receipt.drNo ? `DR No: ${receipt.drNo}` : null,
    receipt.invoiceNo ? `Invoice No: ${receipt.invoiceNo}` : null,
    `Line items: ${lineCount} (total qty ${totalQty})`,
    linePreview ? `Items:\n${linePreview}` : null,
    lineSuffix ? lineSuffix : null,
  ]
    .filter(Boolean)
    .join("\n");

  const common = {
    module: "PROCUREMENT",
    poId: po.id.toString(),
    receiptId: receipt.id.toString(),
  };

  const result = { drCreated: false, invoiceCreated: false };

  if (receipt.drNo) {
    await createDocument({
      ...common,
      title: vendorLabel
        ? `Delivery Receipt ${receipt.drNo} - ${vendorLabel} (PO ${po.poNo})`
        : `Delivery Receipt ${receipt.drNo} - PO ${po.poNo}`,
      notes: `${baseNotes}\nDR No: ${receipt.drNo}`,
      tags: ["DR"],
    });
    result.drCreated = true;
  }

  if (receipt.invoiceNo) {
    await createDocument({
      ...common,
      title: vendorLabel
        ? `Supplier Invoice ${receipt.invoiceNo} - ${vendorLabel} (PO ${po.poNo})`
        : `Supplier Invoice ${receipt.invoiceNo} - PO ${po.poNo}`,
      notes: `${baseNotes}\nInvoice No: ${receipt.invoiceNo}`,
      tags: ["INVOICE"],
    });
    result.invoiceCreated = true;
  }

  return result;
}

async function createDamageDocument({ po, receipt, damagedLines }) {
  if (!receipt || !damagedLines.length) {
    return false;
  }

  const vendorName = po?.vendor?.name || "Unknown vendor";
  const vendorLabel = vendorName !== "Unknown vendor" ? vendorName : null;
  const linePreview = damagedLines
    .map((line, index) => {
      const sku = line.itemSku ? ` (${line.itemSku})` : "";
      const reason = line.damageReason ? ` | Reason: ${line.damageReason}` : "";
      const notes = line.damageNotes ? ` | Notes: ${line.damageNotes}` : "";
      return `${index + 1}. ${line.itemName || `Item #${line.itemId}`}${sku} - damaged ${line.qtyDamaged}${reason}${notes}`;
    })
    .join("\n");

  const baseNotes = [
    "Auto-recorded from Receiving (Damaged on arrival).",
    `PO: ${po.poNo}`,
    `Vendor: ${vendorName}`,
    `Receipt ID: ${receipt.id.toString()}`,
    `Received at: ${receipt.receivedAt.toISOString()}`,
    `Damaged lines: ${damagedLines.length}`,
    linePreview ? `Details:\n${linePreview}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await createDocument({
    module: "PROCUREMENT",
    poId: po.id.toString(),
    receiptId: receipt.id.toString(),
    title: vendorLabel
      ? `Damage report - ${vendorLabel} (PO ${po.poNo})`
      : `Damage report - PO ${po.poNo}`,
    notes: baseNotes,
    tags: ["DAMAGED"],
  });

  return true;
}

// POST /receipts
router.post("/receipts", staffAccess, async (req, res) => {
  try {
    const { poNo, drNo, invoiceNo, lines } = req.body || {};
    if (!poNo) return res.status(400).json({ error: "poNo required" });

    const po = await prisma.pO.findUnique({
      where: { poNo },
      include: { lines: true, vendor: true },
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
          const lotNo = typeof l.lotNo === "string" ? l.lotNo.trim() : "";
          const damagedQty = l.damagedQty !== undefined ? Number(l.damagedQty) : 0;
          if (!Number.isFinite(damagedQty) || damagedQty < 0) {
            throw Object.assign(new Error(`lines[${lineNo}].damagedQty must be >= 0`), {
              status: 400,
              code: "VALIDATION_ERROR",
            });
          }
          if (damagedQty > qtyNumber) {
            throw Object.assign(new Error(`lines[${lineNo}].damagedQty cannot exceed qty`), {
              status: 400,
              code: "VALIDATION_ERROR",
            });
          }
          const damageReason =
            typeof l.damageReason === "string" && l.damageReason.trim().length ? l.damageReason.trim() : null;
          const damageNotes =
            typeof l.damageNotes === "string" && l.damageNotes.trim().length ? l.damageNotes.trim() : null;
          if (damagedQty > 0 && !damageReason) {
            throw Object.assign(new Error(`lines[${lineNo}].damageReason is required when damagedQty > 0`), {
              status: 400,
              code: "VALIDATION_ERROR",
            });
          }
          const damagePhotos = Array.isArray(l.damagePhotos) ? l.damagePhotos : [];
          return {
            itemId,
            toLocId,
            qty: qtyNumber,
            lotNo: lotNo || null,
            expiryDate: toDate(l.expiryDate, `lines[${lineNo}].expiryDate`),
            qtyDamaged: damagedQty,
            damageReason,
            damageNotes,
            damagePhotos: damagePhotos
              .map((photo) => ({
                storageKey: typeof photo?.storageKey === "string" ? photo.storageKey.trim() : "",
                mimeType: typeof photo?.mimeType === "string" ? photo.mimeType.trim() : null,
                size: typeof photo?.size === "number" ? photo.size : null,
                checksum: typeof photo?.checksum === "string" ? photo.checksum.trim() : null,
              }))
              .filter((photo) => photo.storageKey),
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
            qtyDamaged: 0,
            damageReason: null,
            damageNotes: null,
            damagePhotos: [],
          }));
        })();

    const uniqueItemIds = Array.from(new Set(normalizedLines.map((line) => line.itemId.toString()))).map((id) =>
      BigInt(id)
    );
    const { seqMap, dateStr } = await getLotSeqMap(uniqueItemIds, new Date());

    const linesWithLot = normalizedLines.map((line) => {
      if (line.lotNo) {
        return line;
      }
      const key = line.itemId.toString();
      const nextSeq = seqMap.get(key) || 1;
      seqMap.set(key, nextSeq + 1);
      return {
        ...line,
        lotNo: `LOT-${dateStr}-${key}-${String(nextSeq).padStart(3, "0")}`,
      };
    });

    const receipt = await prisma.receipt.create({
      data: {
        poId: po.id,
        drNo: drNo || null,
        invoiceNo: invoiceNo || null,
        lines: {
          create: linesWithLot.map((line) => ({
            itemId: line.itemId,
            toLocId: line.toLocId,
            qty: line.qty,
            lotNo: line.lotNo,
            expiryDate: line.expiryDate,
            qtyDamaged: line.qtyDamaged,
            damageReason: line.damageReason,
            damageNotes: line.damageNotes,
            damagePhotos: line.damagePhotos.length
              ? {
                  create: line.damagePhotos.map((photo) => ({
                    storageKey: photo.storageKey,
                    mimeType: photo.mimeType,
                    size: photo.size,
                    checksum: photo.checksum,
                  })),
                }
              : undefined,
          })),
        },
      },
      include: { lines: { include: { damagePhotos: true } } },
    });

    try {
      for (const line of receipt.lines) {
        const qtyGood = Number(line.qty) - Number(line.qtyDamaged || 0);
        if (qtyGood <= 0) {
          continue;
        }
        await postStockMove({
          itemId: line.itemId.toString(),
          qty: qtyGood.toString(),
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

    let dtrs = { status: "skipped", drCreated: false, invoiceCreated: false, damageCreated: false };
    try {
      const created = await createReceiptDocuments({ po, receipt });
      let itemMap = new Map();
      try {
        const items = await fetchInventoryItems();
        itemMap = new Map(items.map((item) => [String(item.id), item]));
      } catch (err) {
        console.warn("[/receipts] inventory lookup failed for damage report", err.message);
        itemMap = new Map();
      }

      const damagedLines = receipt.lines
        .filter((line) => Number(line.qtyDamaged || 0) > 0)
        .map((line) => {
          const itemId = line.itemId.toString();
          const item = itemMap.get(itemId);
          return {
            itemId,
            itemName: item?.name ?? null,
            itemSku: item?.sku ?? null,
            qtyDamaged: Number(line.qtyDamaged || 0),
            damageReason: line.damageReason || null,
            damageNotes: line.damageNotes || null,
          };
        });

      const damageCreated = await createDamageDocument({ po, receipt, damagedLines });
      dtrs = { status: "ok", damageCreated, ...created };
    } catch (docErr) {
      console.warn("[/receipts] dtrs sync failed", docErr.message);
      dtrs = { status: "failed", drCreated: false, invoiceCreated: false, damageCreated: false };
    }

    res.status(201).json({ receipt, dtrs });
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

router.get("/receipts/:id/detail", staffAccess, async (req, res) => {
  try {
    const id = toBigInt(req.params.id, "id");
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        lines: true,
        PO: { include: { vendor: true, lines: true } },
      },
    });
    if (!receipt) return res.status(404).json({ error: "Receipt not found" });

    let itemMap = new Map();
    try {
      const items = await fetchInventoryItems();
      itemMap = new Map(items.map((item) => [String(item.id), item]));
    } catch (err) {
      console.warn("[/receipts] inventory lookup failed", err.message);
      itemMap = new Map();
    }

    const poLineUnitMap = new Map(
      (receipt.PO?.lines || []).map((line) => [line.itemId.toString(), line.unit])
    );

    const lines = receipt.lines.map((line) => {
      const itemId = line.itemId.toString();
      const item = itemMap.get(itemId);
      return {
        id: line.id.toString(),
        itemId,
        itemName: item?.name ?? null,
        itemSku: item?.sku ?? null,
        unit: poLineUnitMap.get(itemId) || item?.unit || null,
        qty: line.qty,
      };
    });

    const totalQty = lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);

    res.json({
      receipt: {
        id: receipt.id.toString(),
        drNo: receipt.drNo ?? null,
        invoiceNo: receipt.invoiceNo ?? null,
        receivedAt: receipt.receivedAt,
        arrivalDate: receipt.arrivalDate ?? null,
      },
      po: receipt.PO
        ? {
            id: receipt.PO.id.toString(),
            poNo: receipt.PO.poNo,
            status: receipt.PO.status,
            orderedAt: receipt.PO.orderedAt,
            vendorName: receipt.PO.vendor?.name ?? null,
          }
        : null,
      totals: {
        lineCount: lines.length,
        totalQty,
      },
      lines,
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    console.error("[GET /receipts/:id/detail] error", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
