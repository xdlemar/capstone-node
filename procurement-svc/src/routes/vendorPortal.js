const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const { fetchInventoryItems } = require("../inventoryClient");
const { fetchPoDeliveryStatuses } = require("../pltClient");

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

function getUserId(req) {
  const sub = req.user?.sub;
  return sub ? String(sub) : null;
}

async function getVendorIdsForUser(userId) {
  const links = await prisma.vendorUser.findMany({
    where: { userId },
    select: { vendorId: true },
  });
  return links.map((link) => link.vendorId);
}

function parseStatusFilter(value) {
  if (!value) return null;
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  const statuses = raw
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
  return statuses.length ? statuses : null;
}

router.get("/pos", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const vendorIds = await getVendorIdsForUser(userId);
    if (!vendorIds.length) return res.status(403).json({ error: "Vendor access not configured" });

    const statusFilter = parseStatusFilter(req.query.status);
    const includeDelivered =
      String(req.query.includeDelivered || "").toLowerCase() === "true" ||
      String(req.query.includeDelivered || "") === "1";
    const where = {
      vendorId: { in: vendorIds },
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
    };

    const orders = await prisma.pO.findMany({
      where,
      include: { vendor: true, lines: true },
      orderBy: { orderedAt: "desc" },
    });

    let deliveryStatusMap = new Map();
    if (orders.length) {
      try {
        const statuses = await fetchPoDeliveryStatuses(orders.map((po) => po.id.toString()));
        deliveryStatusMap = new Map(statuses.map((row) => [String(row.poId), row.status]));
      } catch (err) {
        console.error("[vendor portal] delivery status lookup failed", err);
        deliveryStatusMap = new Map();
      }
    }

    let itemMap = new Map();
    try {
      const items = await fetchInventoryItems();
      itemMap = new Map(items.map((item) => [String(item.id), item]));
    } catch (err) {
      console.error("[vendor portal] inventory lookup failed", err);
      itemMap = new Map();
    }

    res.json(
      orders
        .filter((po) => {
          if (includeDelivered) return true;
          const deliveryStatus = deliveryStatusMap.get(po.id.toString());
          return deliveryStatus !== "DELIVERED";
        })
        .map((po) => ({
          id: po.id.toString(),
          poNo: po.poNo,
          status: po.status,
          orderedAt: po.orderedAt,
          deliveryStatus: deliveryStatusMap.get(po.id.toString()) ?? null,
          vendor: { id: po.vendor.id.toString(), name: po.vendor.name },
          lineCount: po.lines.length,
          totalQty: po.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0),
          linesPreview: po.lines.slice(0, 3).map((line) => ({
            id: line.id.toString(),
            itemId: line.itemId.toString(),
            itemName: itemMap.get(line.itemId.toString())?.name ?? null,
            itemSku: itemMap.get(line.itemId.toString())?.sku ?? null,
            itemStrength: itemMap.get(line.itemId.toString())?.strength ?? null,
            itemType: itemMap.get(line.itemId.toString())?.type ?? null,
            qty: line.qty,
            unit: line.unit,
          })),
          vendorAcknowledgedAt: po.vendorAcknowledgedAt,
          vendorAcknowledgedBy: po.vendorAcknowledgedBy,
          vendorNote: po.vendorNote,
        }))
    );
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    console.error("[vendor portal] GET /pos", err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/pos/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const vendorIds = await getVendorIdsForUser(userId);
    if (!vendorIds.length) return res.status(403).json({ error: "Vendor access not configured" });

    const poId = toBigInt(req.params.id, "id");
    const po = await prisma.pO.findFirst({
      where: { id: poId, vendorId: { in: vendorIds } },
      include: { vendor: true, lines: true },
    });

    if (!po) return res.status(404).json({ error: "PO not found" });

    let itemMap = new Map();
    try {
      const items = await fetchInventoryItems();
      itemMap = new Map(items.map((item) => [String(item.id), item]));
    } catch (err) {
      console.error("[vendor portal] inventory lookup failed", err);
      itemMap = new Map();
    }

    res.json({
      id: po.id.toString(),
      poNo: po.poNo,
      status: po.status,
      orderedAt: po.orderedAt,
      vendor: { id: po.vendor.id.toString(), name: po.vendor.name },
      vendorAcknowledgedAt: po.vendorAcknowledgedAt,
      vendorAcknowledgedBy: po.vendorAcknowledgedBy,
      vendorNote: po.vendorNote,
      lines: po.lines.map((line) => ({
        id: line.id.toString(),
        itemId: line.itemId.toString(),
        itemName: itemMap.get(line.itemId.toString())?.name ?? null,
        itemSku: itemMap.get(line.itemId.toString())?.sku ?? null,
        itemUnit: itemMap.get(line.itemId.toString())?.unit ?? null,
        itemStrength: itemMap.get(line.itemId.toString())?.strength ?? null,
        itemType: itemMap.get(line.itemId.toString())?.type ?? null,
        qty: line.qty,
        unit: line.unit,
        price: Number(line.price),
        notes: line.notes,
      })),
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    console.error("[vendor portal] GET /pos/:id", err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.patch("/pos/:id/ack", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const vendorIds = await getVendorIdsForUser(userId);
    if (!vendorIds.length) return res.status(403).json({ error: "Vendor access not configured" });

    const poId = toBigInt(req.params.id, "id");
    const po = await prisma.pO.findFirst({
      where: { id: poId, vendorId: { in: vendorIds } },
    });

    if (!po) return res.status(404).json({ error: "PO not found" });

    if (po.vendorAcknowledgedAt) {
      return res.json({
        id: po.id.toString(),
        vendorAcknowledgedAt: po.vendorAcknowledgedAt,
        vendorAcknowledgedBy: po.vendorAcknowledgedBy,
        vendorNote: po.vendorNote,
      });
    }

    const note =
      typeof req.body?.note === "string" && req.body.note.trim().length ? req.body.note.trim() : null;

    const updated = await prisma.pO.update({
      where: { id: po.id },
      data: {
        vendorAcknowledgedAt: new Date(),
        vendorAcknowledgedBy: userId,
        vendorNote: note,
      },
    });

    res.json({
      id: updated.id.toString(),
      vendorAcknowledgedAt: updated.vendorAcknowledgedAt,
      vendorAcknowledgedBy: updated.vendorAcknowledgedBy,
      vendorNote: updated.vendorNote,
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    console.error("[vendor portal] PATCH /pos/:id/ack", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
