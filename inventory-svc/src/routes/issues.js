const { Router } = require("express");
const { Prisma } = require("@prisma/client");
const { prisma } = require("../prisma");

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

/**
 * POST /issues
 * { issueNo, fromLocId, toLocId, notes?, lines: [{ itemId, qty, notes? }] }
 * FEFO-first; fallback to single no-batch move if no batches/stock tracked.
 */
r.post("/", async (req, res) => {
  try {
    const { issueNo, fromLocId, toLocId, notes, lines = [] } = req.body || {};
    if (!issueNo || !fromLocId || !toLocId || !Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ error: "issueNo, fromLocId, toLocId, lines[] required" });
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

    // Run everything in a txn; return only the id, then refetch after updates
    const issueId = await prisma.$transaction(async (p) => {
      const issue = await p.issue.create({
        data: {
          issueNo,
          fromLocId: fromLocIdBig,
          toLocId: toLocIdBig,
          notes: notes ?? null,
          lines: {
            create: normalizedLines.map((ln) => ({
              itemId: ln.itemId,
              qtyReq: ln.qtyDecimal,
              qtyIssued: new Prisma.Decimal(0),
              notes: ln.notes,
            })),
          },
        },
        include: { lines: true },
      });

      // FEFO allocations per line
      for (const ln of issue.lines) {
        let remaining = Number(ln.qtyReq);
        if (remaining <= 0) continue;

        const batches = await p.batch.findMany({
          where: { itemId: ln.itemId },
          orderBy: [{ expiryDate: "asc" }, { id: "asc" }],
          select: { id: true, qtyOnHand: true },
        });

        const totalAvail = batches.reduce((sum, b) => sum + Number(b.qtyOnHand || 0), 0);

        if (batches.length === 0 || totalAvail <= 0) {
          await p.stockMove.create({
            data: {
              itemId: ln.itemId,
              fromLocId: issue.fromLocId,
              toLocId: issue.toLocId,
              qty: remaining.toString(),
              reason: "ISSUE",
              refType: "ISSUE",
              refId: issue.id,
              eventId: `issue:${issue.id.toString()}:${ln.id.toString()}:nobatch`,
              occurredAt: new Date(),
            },
          });

          await p.issueLine.update({
            where: { id: ln.id },
            data: { qtyIssued: ln.qtyReq },
          });

          continue;
        }

        for (const b of batches) {
          if (remaining <= 0) break;
          const available = Number(b.qtyOnHand || 0);
          if (available <= 0) continue;

          const take = Math.min(available, remaining);

          await p.issueAlloc.create({
            data: { issueLineId: ln.id, batchId: b.id, qty: take.toString() },
          });

          await p.stockMove.create({
            data: {
              itemId: ln.itemId,
              batchId: b.id,
              fromLocId: issue.fromLocId,
              toLocId: issue.toLocId,
              qty: take.toString(),
              reason: "ISSUE",
              refType: "ISSUE",
              refId: issue.id,
              eventId: `issue:${issue.id.toString()}:${ln.id.toString()}:batch:${b.id.toString()}`,
              occurredAt: new Date(),
            },
          });

          await p.batch.update({
            where: { id: b.id },
            data: { qtyOnHand: { decrement: take.toString() } },
          });

          remaining -= take;
        }

        if (remaining > 0) {
          await p.stockMove.create({
            data: {
              itemId: ln.itemId,
              fromLocId: issue.fromLocId,
              toLocId: issue.toLocId,
              qty: remaining.toString(),
              reason: "ISSUE",
              refType: "ISSUE",
              refId: issue.id,
              eventId: `issue:${issue.id.toString()}:${ln.id.toString()}:remainder-nobatch`,
              occurredAt: new Date(),
            },
          });
          remaining = 0;
        }

        await p.issueLine.update({
          where: { id: ln.id },
          data: { qtyIssued: ln.qtyReq },
        });
      }

      return issue.id; // return only id; we will refetch after txn
    });

    // Refetch after all updates so lines reflect final qtyIssued
    const created = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { lines: true },
    });

    res.status(201).json({
      id: created.id.toString(),
      issueNo: created.issueNo,
      fromLocId: created.fromLocId.toString(),
      toLocId: created.toLocId ? created.toLocId.toString() : null,
      notes: created.notes,
      createdAt: created.createdAt,
      lines: created.lines.map((l) => ({
        id: l.id.toString(),
        issueId: l.issueId.toString(),
        itemId: l.itemId.toString(),
        qtyReq: Number(l.qtyReq),
        qtyIssued: Number(l.qtyIssued),
        notes: l.notes,
      })),
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    if (err?.code === "P2002") return res.status(409).json({ error: "Issue number already exists" });
    if (err?.code === "P2003") return res.status(400).json({ error: "Invalid fromLocId/toLocId foreign key" });
    if (err?.code === "FEFO_STOCK_OUT") return res.status(409).json({ error: "Insufficient stock (FEFO)" });
    console.error("[POST /issues]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
