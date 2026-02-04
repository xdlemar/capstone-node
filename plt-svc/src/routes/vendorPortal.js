const router = require("express").Router();
const crypto = require("crypto");
const { prisma } = require("../prisma");
const { getPoApprovalById, upsertVendorReceiptDraft } = require("../procurementClient");

const ALLOWED = {
  DRAFT: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT", "DELAYED", "CANCELLED"],
  IN_TRANSIT: ["DELAYED", "DELIVERED", "CANCELLED"],
  DELAYED: ["IN_TRANSIT", "DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const ALERT_TYPES = {
  STATUS_DELAY: "STATUS_DELAY",
  ETA_MISSED: "ETA_MISSED",
};

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

function toDate(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  return dt;
}

function normalizeUserId(value) {
  if (!value) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

async function generateTrackingNo() {
  for (let i = 0; i < 5; i += 1) {
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    const stamp = Date.now().toString(36).toUpperCase();
    const candidate = `TRK-${stamp}-${random}`;
    const exists = await prisma.delivery.findFirst({ where: { trackingNo: candidate } });
    if (!exists) return candidate;
  }
  throw Object.assign(new Error("Unable to generate tracking number"), {
    status: 500,
    code: "TRACKING_GENERATION_FAILED",
  });
}

async function getVendorIdsForUser(userId) {
  const links = await prisma.vendorUser.findMany({
    where: { userId },
    select: { vendorId: true },
  });
  return links.map((link) => link.vendorId);
}

async function ensureAlert(deliveryId, type, message) {
  const existing = await prisma.deliveryAlert.findFirst({
    where: { deliveryId, type, resolvedAt: null },
  });

  if (!existing) {
    await prisma.deliveryAlert.create({
      data: { deliveryId, type, message },
    });
    return;
  }

  if (existing.message !== message) {
    await prisma.deliveryAlert.update({
      where: { id: existing.id },
      data: { message },
    });
  }
}

async function resolveAlerts(deliveryId, type = null) {
  await prisma.deliveryAlert.updateMany({
    where: {
      deliveryId,
      resolvedAt: null,
      ...(type ? { type } : {}),
    },
    data: { resolvedAt: new Date() },
  });
}

async function ensureProcurementProject() {
  const code = "PROCUREMENT";
  const existing = await prisma.project.findUnique({ where: { code } });
  if (existing) return existing.id;

  const created = await prisma.project.create({
    data: {
      code,
      name: "Procurement Orders",
      status: "ACTIVE",
      description: "Auto-generated project for vendor supply deliveries.",
    },
  });
  return created.id;
}

function normalizeStatus(value) {
  if (!value) return null;
  const status = String(value).toUpperCase();
  const allowed = ["DRAFT", "DISPATCHED", "IN_TRANSIT", "DELAYED"];
  return allowed.includes(status) ? status : null;
}

function normalizeReceiptLines(input) {
  const lines = Array.isArray(input) ? input : [];
  if (!lines.length) {
    throw Object.assign(new Error("receiptLines are required"), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }

  return lines.map((line, idx) => {
    const lineNo = idx + 1;
    const itemId = toBigInt(line?.itemId, `receiptLines[${lineNo}].itemId`);
    const qtyNumber = typeof line?.qty === "number" ? line.qty : Number(line?.qty);
    if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
      throw Object.assign(new Error(`receiptLines[${lineNo}].qty must be positive`), {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }
    const lotNo = typeof line?.lotNo === "string" ? line.lotNo.trim() : "";
    if (!lotNo) {
      throw Object.assign(new Error(`receiptLines[${lineNo}].lotNo is required`), {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }
    const expiryDate = toDate(line?.expiryDate, `receiptLines[${lineNo}].expiryDate`);
    if (!expiryDate) {
      throw Object.assign(new Error(`receiptLines[${lineNo}].expiryDate is required`), {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }
    return {
      itemId: itemId.toString(),
      qty: qtyNumber,
      lotNo,
      expiryDate: expiryDate.toISOString(),
    };
  });
}

router.post("/shipments", async (req, res, next) => {
  try {
    const userId = normalizeUserId(req.user?.sub);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const vendorIds = await getVendorIdsForUser(userId);
    if (!vendorIds.length) return res.status(403).json({ error: "Vendor access not configured" });

    const vendorIdParam = req.body?.vendorId ? toBigInt(req.body.vendorId, "vendorId") : null;
    const vendorId =
      vendorIdParam && vendorIds.some((id) => id === vendorIdParam)
        ? vendorIdParam
        : vendorIds.length === 1
        ? vendorIds[0]
        : null;

    if (!vendorId) {
      return res.status(400).json({ error: "Vendor selection required" });
    }

    const poId = toBigInt(req.body?.poId, "poId");
    const eta = toDate(req.body?.eta, "eta");
    const departedAt = toDate(req.body?.departedAt, "departedAt");
    const status = normalizeStatus(req.body?.status) || "DISPATCHED";
    const receiptLines = normalizeReceiptLines(req.body?.receiptLines);
    const receiptDrNo = req.body?.receiptDrNo ? String(req.body.receiptDrNo).trim() : null;
    const receiptInvoiceNo = req.body?.receiptInvoiceNo ? String(req.body.receiptInvoiceNo).trim() : null;

    const approval = await getPoApprovalById(poId);
    if (!approval) {
      return res.status(404).json({ error: "PO not found" });
    }

    const approvalVendorId = approval.vendorId ? BigInt(approval.vendorId) : null;
    if (!approvalVendorId || approvalVendorId !== vendorId) {
      return res.status(403).json({ error: "PO not assigned to vendor" });
    }

    if (!approval.vendorAcknowledgedAt) {
      return res.status(409).json({ error: "Order not approved yet" });
    }

    const projectId = await ensureProcurementProject();

    const existing = await prisma.delivery.findFirst({
      where: { poId, vendorId },
    });
    if (existing) {
      return res.status(409).json({ error: "Shipment already scheduled" });
    }

    let trackingNo = req.body?.trackingNo ? String(req.body.trackingNo).trim() : "";
    if (trackingNo) {
      const conflict = await prisma.delivery.findFirst({ where: { trackingNo } });
      if (conflict) {
        return res.status(409).json({ error: "Tracking number already in use" });
      }
    } else {
      trackingNo = await generateTrackingNo();
    }

    const delivery = await prisma.delivery.create({
      data: {
        projectId,
        poId,
        vendorId,
        status,
        trackingNo,
        lastKnown: req.body?.lastKnown || null,
        notes: req.body?.notes || null,
        eta,
        departedAt,
        updates: {
          create: status !== "DRAFT" ? { status, message: "Shipment scheduled by vendor." } : undefined,
        },
      },
    });

    try {
      await upsertVendorReceiptDraft({
        poId: poId.toString(),
        vendorId: vendorId.toString(),
        createdBy: userId,
        drNo: receiptDrNo || null,
        invoiceNo: receiptInvoiceNo || null,
        lines: receiptLines,
      });
    } catch (err) {
      await prisma.delivery.delete({ where: { id: delivery.id } }).catch(() => {});
      throw Object.assign(new Error("Failed to save vendor receipt details"), {
        status: 502,
        cause: err,
      });
    }

    res.status(201).json(delivery);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    if (e?.status === 502) return res.status(502).json({ error: e.message });
    next(e);
  }
});

router.get("/shipments/next-tracking", async (req, res, next) => {
  try {
    const userId = normalizeUserId(req.user?.sub);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const vendorIds = await getVendorIdsForUser(userId);
    if (!vendorIds.length) return res.status(403).json({ error: "Vendor access not configured" });

    const trackingNo = await generateTrackingNo();
    res.json({ trackingNo });
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

router.get("/shipments", async (req, res, next) => {
  try {
    const userId = normalizeUserId(req.user?.sub);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const vendorIds = await getVendorIdsForUser(userId);
    if (!vendorIds.length) return res.status(403).json({ error: "Vendor access not configured" });

    const status = req.query.status ? String(req.query.status).toUpperCase() : null;
    const poId = req.query.poId ? toBigInt(req.query.poId, "poId") : null;

    const rows = await prisma.delivery.findMany({
      where: {
        vendorId: { in: vendorIds },
        ...(status ? { status } : {}),
        ...(poId ? { poId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: { id: true, code: true, name: true },
        },
        updates: {
          orderBy: { occurredAt: "desc" },
          take: 3,
          select: { id: true, status: true, message: true, place: true, occurredAt: true },
        },
      },
    });

    res.json(
      rows.map((row) => ({
        id: row.id.toString(),
        poId: row.poId ? row.poId.toString() : null,
        vendorId: row.vendorId ? row.vendorId.toString() : null,
        status: row.status,
        trackingNo: row.trackingNo ?? null,
        eta: row.eta,
        departedAt: row.departedAt,
        arrivedAt: row.arrivedAt,
        lastKnown: row.lastKnown ?? null,
        notes: row.notes ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        project: row.project
          ? {
              id: row.project.id.toString(),
              code: row.project.code,
              name: row.project.name,
            }
          : null,
        updates: row.updates.map((update) => ({
          id: update.id.toString(),
          status: update.status,
          message: update.message ?? null,
          place: update.place ?? null,
          occurredAt: update.occurredAt,
        })),
      }))
    );
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

router.patch("/shipments/:id", async (req, res, next) => {
  try {
    const userId = normalizeUserId(req.user?.sub);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const vendorIds = await getVendorIdsForUser(userId);
    if (!vendorIds.length) return res.status(403).json({ error: "Vendor access not configured" });

    const id = toBigInt(req.params.id, "id");
    const delivery = await prisma.delivery.findFirst({
      where: { id, vendorId: { in: vendorIds } },
    });
    if (!delivery) return res.status(404).json({ error: "Shipment not found" });

    const status = req.body?.status ? String(req.body.status).toUpperCase() : null;
    if (status && !ALLOWED[delivery.status]?.includes(status)) {
      return res.status(400).json({ error: `Illegal ${delivery.status} -> ${status}` });
    }

    const eta = toDate(req.body?.eta, "eta");
    const departedAt = toDate(req.body?.departedAt, "departedAt");
    const occurredAt = toDate(req.body?.occurredAt, "occurredAt");

    const trackingNo = req.body?.trackingNo !== undefined ? String(req.body.trackingNo).trim() || null : undefined;
    const lastKnown = req.body?.lastKnown !== undefined ? String(req.body.lastKnown).trim() || null : undefined;
    const notes = req.body?.notes !== undefined ? String(req.body.notes).trim() || null : undefined;

    if (trackingNo && trackingNo !== delivery.trackingNo) {
      const conflict = await prisma.delivery.findFirst({ where: { trackingNo } });
      if (conflict) {
        return res.status(409).json({ error: "Tracking number already in use" });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const data = {
        ...(status ? { status, arrivedAt: status === "DELIVERED" ? new Date() : delivery.arrivedAt } : {}),
        ...(trackingNo !== undefined ? { trackingNo } : {}),
        ...(eta !== null ? { eta } : eta === null && req.body?.eta !== undefined ? { eta: null } : {}),
        ...(departedAt !== null ? { departedAt } : departedAt === null && req.body?.departedAt !== undefined ? { departedAt: null } : {}),
        ...(lastKnown !== undefined ? { lastKnown } : {}),
        ...(notes !== undefined ? { notes } : {}),
      };

      const d = await tx.delivery.update({
        where: { id },
        data,
      });

      if (status) {
        await tx.deliveryUpdate.create({
          data: {
            deliveryId: id,
            status,
            message: req.body?.message || null,
            place: req.body?.place || null,
            occurredAt: occurredAt || undefined,
          },
        });
      }

      return d;
    });

    if (status) {
      if (status === "DELIVERED" || status === "CANCELLED") {
        await resolveAlerts(id);
      } else if (status === "DELAYED") {
        const baseMessage = req.body?.message || "Delivery flagged as delayed";
        await ensureAlert(id, ALERT_TYPES.STATUS_DELAY, baseMessage);
      } else {
        await resolveAlerts(id, ALERT_TYPES.STATUS_DELAY);
      }
    }

    const etaValue = updated.eta ? new Date(updated.eta) : null;
    if (etaValue && updated.status !== "DELIVERED" && updated.status !== "CANCELLED") {
      if (Date.now() > etaValue.getTime()) {
        await ensureAlert(
          id,
          ALERT_TYPES.ETA_MISSED,
          `Delivery ${id.toString()} missed ETA ${etaValue.toISOString()}`
        );
      } else {
        await resolveAlerts(id, ALERT_TYPES.ETA_MISSED);
      }
    } else {
      await resolveAlerts(id, ALERT_TYPES.ETA_MISSED);
    }

    res.json(updated);
  } catch (e) {
    if (e?.status === 400) return res.status(400).json({ error: e.message });
    next(e);
  }
});

module.exports = router;
