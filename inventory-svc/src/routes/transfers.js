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

function serializeTransfer(row) {
  return {
    id: row.id.toString(),
    transferNo: row.transferNo,
    status: row.status,
    fromLocId: row.fromLocId.toString(),
    toLocId: row.toLocId.toString(),
    fromLocName: row.fromLoc?.name ?? null,
    toLocName: row.toLoc?.name ?? null,
    notes: row.notes,
    requestedBy: row.requestedBy,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    lines: row.lines.map((l) => ({
      id: l.id.toString(),
      itemId: l.itemId.toString(),
      qty: Number(l.qty),
      notes: l.notes,
    })),
  };
}

async function fulfillTransfer(client, transfer) {
  const lines = transfer.lines ?? (await client.transferLine.findMany({ where: { transferId: transfer.id } }));

  for (const ln of lines) {
    let remaining = Number(ln.qty);
    if (remaining <= 0) continue;

    const batches = await client.batch.findMany({
      where: { itemId: ln.itemId },
      orderBy: [{ expiryDate: "asc" }, { id: "asc" }],
      select: { id: true, qtyOnHand: true },
    });

    for (const b of batches) {
      if (remaining <= 0) break;
      const available = Number(b.qtyOnHand || 0);
      if (available <= 0) continue;

      const take = Math.min(available, remaining);

      await recordStockMove(
        {
          itemId: ln.itemId,
          qty: take,
          reason: "TRANSFER",
          refType: "TRANSFER",
          refId: transfer.id,
          eventId: `transfer:${transfer.transferNo}:${ln.id.toString()}:batch:${b.id.toString()}`,
          fromLocId: transfer.fromLocId,
          toLocId: transfer.toLocId,
          batchId: b.id,
        },
        { client }
      );

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
}

/**
 * POST /transfers
 * Staff create pending transfers. Managers/Admins auto-approve immediately.
 */
r.post("/", async (req, res) => {
  try {
    if (isApprover(req.user)) {
      return res.status(403).json({ error: "Approvers manage transfers from the approvals queue." });
    }
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

    const requester = getUserIdentifier(req.user);

    const created = await prisma.$transaction(async (p) => {
      const xfer = await p.transfer.create({
        data: {
          transferNo,
          fromLocId: fromLocIdBig,
          toLocId: toLocIdBig,
          notes: notes ?? null,
          status: "PENDING",
          requestedBy: requester,
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
          lines: {
            create: normalizedLines.map((ln) => ({
              itemId: ln.itemId,
              qty: ln.qtyDecimal,
              notes: ln.notes,
            })),
          },
        },
        include: { lines: true, fromLoc: true, toLoc: true },
      });

      return xfer;
    });

    return res
      .status(201)
      .json(serializeTransfer(created));
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    if (err?.code === "FEFO_STOCK_OUT") return res.status(409).json({ error: "Insufficient stock (FEFO)" });
    if (err?.code === "P2002") return res.status(409).json({ error: "Transfer number already exists" });
    if (err?.code === "P2003") return res.status(400).json({ error: "Invalid fromLocId/toLocId" });
    console.error("[POST /transfers]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

r.get("/", async (req, res) => {
  try {
    const requester = getUserIdentifier(req.user);
    const approver = isApprover(req.user);
    const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : null;

    const where = {};
    if (statusFilter) {
      if (!["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
        return res.status(400).json({ error: "Invalid status filter" });
      }
      where.status = statusFilter;
    }
    if (!approver) {
      where.requestedBy = requester || "__UNKNOWN__";
    }

    const transfers = await prisma.transfer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { lines: true, fromLoc: true, toLoc: true },
      take: 100,
    });

    res.json({ rows: transfers.map(serializeTransfer) });
  } catch (err) {
    console.error("[GET /transfers]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

function ensureApprover(req, res) {
  if (!isApprover(req.user)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

r.post("/:id/approve", async (req, res) => {
  if (!ensureApprover(req, res)) return;
  try {
    const id = parseBigInt(req.params.id, "id");
    const reviewer = getUserIdentifier(req.user);

    const updated = await prisma.$transaction(async (p) => {
      const transfer = await p.transfer.findUnique({
        where: { id },
        include: { lines: true, fromLoc: true, toLoc: true },
      });
      if (!transfer) {
        const err = new Error("Transfer not found");
        err.status = 404;
        throw err;
      }
      if (transfer.status === "REJECTED") {
        const err = new Error("Transfer already rejected");
        err.status = 409;
        throw err;
      }
      if (transfer.status === "APPROVED") {
        return transfer;
      }

      await fulfillTransfer(p, transfer);

      return p.transfer.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedBy: reviewer,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
        include: { lines: true, fromLoc: true, toLoc: true },
      });
    });

    res.json(serializeTransfer(updated));
  } catch (err) {
    if (err?.status === 404) return res.status(404).json({ error: err.message });
    if (err?.status === 409) return res.status(409).json({ error: err.message });
    if (err?.code === "FEFO_STOCK_OUT") return res.status(409).json({ error: "Insufficient stock (FEFO)" });
    console.error("[POST /transfers/:id/approve]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

r.post("/:id/reject", async (req, res) => {
  if (!ensureApprover(req, res)) return;
  try {
    const id = parseBigInt(req.params.id, "id");
    const reviewer = getUserIdentifier(req.user);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : null;

    const updated = await prisma.$transaction(async (p) => {
      const transfer = await p.transfer.findUnique({
        where: { id },
        include: { lines: true, fromLoc: true, toLoc: true },
      });
      if (!transfer) {
        const err = new Error("Transfer not found");
        err.status = 404;
        throw err;
      }
      if (transfer.status === "APPROVED") {
        const err = new Error("Transfer already approved");
        err.status = 409;
        throw err;
      }
      if (transfer.status === "REJECTED") {
        return transfer;
      }

      return p.transfer.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedBy: reviewer,
          reviewedAt: new Date(),
          rejectionReason: reason,
        },
        include: { lines: true, fromLoc: true, toLoc: true },
      });
    });

    res.json(serializeTransfer(updated));
  } catch (err) {
    if (err?.status === 404) return res.status(404).json({ error: err.message });
    if (err?.status === 409) return res.status(409).json({ error: err.message });
    console.error("[POST /transfers/:id/reject]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
