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

function getRoles(user) {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles;
  if (typeof user.role === "string") return [user.role];
  return [];
}

function isApprover(user) {
  const roles = getRoles(user);
  return roles.includes("MANAGER") || roles.includes("ADMIN");
}

function getUserIdentifier(user) {
  if (!user) return null;
  if (user.sub) return String(user.sub);
  if (user.email) return String(user.email);
  return null;
}

function serialize(row) {
  return {
    id: row.id.toString(),
    batchId: row.batchId.toString(),
    itemId: row.itemId.toString(),
    fromLocId: row.fromLocId.toString(),
    qty: Number(row.qty),
    status: row.status,
    reason: row.reason,
    requestedBy: row.requestedBy,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    rejectionReason: row.rejectionReason,
    disposedAt: row.disposedAt,
    method: row.method,
    witness: row.witness,
    referenceNo: row.referenceNo,
    itemName: row.item?.name ?? null,
    fromLocName: row.fromLoc?.name ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

r.post("/", async (req, res) => {
  try {
    if (isApprover(req.user)) {
      return res.status(403).json({ error: "Approvers cannot submit disposal requests." });
    }
    const { batchId, qty, fromLocId, reason } = req.body || {};
    const batchIdBig = parseBigInt(batchId, "batchId");
    const fromLocIdBig = parseBigInt(fromLocId, "fromLocId");
    const parsedQty = parseQty(qty, "qty");

    const batch = await prisma.batch.findUnique({ where: { id: batchIdBig } });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const available = Number(batch.qtyOnHand || 0);
    if (available < parsedQty.number) {
      return res.status(409).json({ error: "Insufficient batch quantity" });
    }

    const requestedBy = getUserIdentifier(req.user);

    const created = await prisma.disposalRequest.create({
      data: {
        batchId: batchIdBig,
        itemId: batch.itemId,
        fromLocId: fromLocIdBig,
        qty: parsedQty.decimal,
        reason: reason ?? null,
        requestedBy,
        status: "PENDING",
      },
      include: { item: true, fromLoc: true },
    });

    return res.status(201).json(serialize(created));
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    console.error("[POST /disposals]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

r.get("/", async (req, res) => {
  try {
    const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : null;
    const where = {};
    if (statusFilter) {
      if (!["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
        return res.status(400).json({ error: "Invalid status filter" });
      }
      where.status = statusFilter;
    }

    const rows = await prisma.disposalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { item: true, fromLoc: true },
    });

    res.json(rows.map(serialize));
  } catch (err) {
    console.error("[GET /disposals]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

r.post("/:id/approve", async (req, res) => {
  try {
    if (!isApprover(req.user)) return res.status(403).json({ error: "Forbidden" });
    const idBig = parseBigInt(req.params.id, "id");
    const { method, witness, referenceNo, disposedAt } = req.body || {};

    if (!method || !referenceNo) {
      return res.status(400).json({ error: "method and referenceNo are required" });
    }

    const reviewedBy = getUserIdentifier(req.user);
    const reviewedAt = new Date();
    const disposeAt = disposedAt ? new Date(disposedAt) : new Date();

    const updated = await prisma.$transaction(async (p) => {
      const request = await p.disposalRequest.findUnique({ where: { id: idBig } });
      if (!request) throw Object.assign(new Error("Disposal request not found"), { status: 404 });
      if (request.status !== "PENDING") {
        throw Object.assign(new Error("Disposal request already processed"), { status: 409 });
      }

      const batch = await p.batch.findUnique({ where: { id: request.batchId } });
      if (!batch) throw Object.assign(new Error("Batch not found"), { status: 404 });

      const available = Number(batch.qtyOnHand || 0);
      const qtyNumber = Number(request.qty);
      if (available < qtyNumber) {
        throw Object.assign(new Error("Insufficient batch quantity"), { status: 409 });
      }

      await recordStockMove(
        {
          itemId: request.itemId,
          qty: qtyNumber,
          reason: "DISPOSAL",
          refType: "DISPOSAL",
          refId: request.id,
          eventId: `disposal:${request.id.toString()}`,
          fromLocId: request.fromLocId,
          batchId: request.batchId,
        },
        { client: p }
      );

      const remaining = available - qtyNumber;
      const batchUpdate = {};
      if (remaining <= 0) {
        batchUpdate.status = "DISPOSED";
        batchUpdate.disposedAt = disposeAt;
      }

      if (Object.keys(batchUpdate).length) {
        await p.batch.update({ where: { id: batch.id }, data: batchUpdate });
      }

      const approved = await p.disposalRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          reviewedBy,
          reviewedAt,
          disposedAt: disposeAt,
          method,
          witness: witness ?? null,
          referenceNo,
        },
        include: { item: true, fromLoc: true },
      });

      return approved;
    });

    return res.json(serialize(updated));
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message });
    console.error("[POST /disposals/:id/approve]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

r.post("/:id/reject", async (req, res) => {
  try {
    if (!isApprover(req.user)) return res.status(403).json({ error: "Forbidden" });
    const idBig = parseBigInt(req.params.id, "id");
    const { reason } = req.body || {};

    const reviewedBy = getUserIdentifier(req.user);
    const reviewedAt = new Date();

    const updated = await prisma.disposalRequest.update({
      where: { id: idBig },
      data: {
        status: "REJECTED",
        reviewedBy,
        reviewedAt,
        rejectionReason: reason ?? "Rejected",
      },
      include: { item: true, fromLoc: true },
    });

    return res.json(serialize(updated));
  } catch (err) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Disposal request not found" });
    console.error("[POST /disposals/:id/reject]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
