const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const r = Router();

/**
 * POST /issues
 * { issueNo, fromLocId, toLocId?, notes?, lines: [{ itemId, qty, notes? }] }
 * FEFO-first; fallback to single no-batch move if no batches/stock tracked.
 */
r.post("/", async (req, res) => {
  try {
    const { issueNo, fromLocId, toLocId, notes, lines = [] } = req.body || {};
    if (!issueNo || !fromLocId || !Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ error: "issueNo, fromLocId, lines[] required" });
    }

    // Run everything in a txn; return only the id, then refetch after updates
    const issueId = await prisma.$transaction(async (p) => {
      const issue = await p.issue.create({
        data: {
          issueNo,
          fromLocId: BigInt(fromLocId),
          toLocId: toLocId ? BigInt(toLocId) : null,
          notes: notes ?? null,
          lines: {
            create: lines.map((ln) => ({
              itemId: BigInt(ln.itemId),
              qtyReq: Number(ln.qty),
              qtyIssued: 0,
              notes: ln.notes ?? null,
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
          throw Object.assign(new Error("Insufficient stock for issue"), { code: "FEFO_STOCK_OUT" });
        }

        for (const b of batches) {
          if (remaining <= 0) break;
          const available = Number(b.qtyOnHand || 0);
          if (available <= 0) continue;

          const take = Math.min(available, remaining);
          if (take <= 0) continue;

          await p.issueAlloc.create({
            data: { issueLineId: ln.id, batchId: b.id, qty: take },
          });

          await p.stockMove.create({
            data: {
              itemId: ln.itemId,
              batchId: b.id,
              fromLocId: issue.fromLocId,
              toLocId: issue.toLocId,
              qty: take,
              reason: "ISSUE",
              refType: "ISSUE",
              refId: issue.id,
              eventId: `issue:${issue.id.toString()}:${ln.id.toString()}:batch:${b.id.toString()}`,
              occurredAt: new Date(),
            },
          });

          await p.batch.update({
            where: { id: b.id },
            data: {
              qtyOnHand: {
                decrement: String(take),
              },
            },
          });

          const nextAvailable = Math.max(0, available - take);
          b.qtyOnHand = nextAvailable;
          remaining = Math.max(0, remaining - take);
        }

        if (remaining > 0) {
          throw Object.assign(new Error("Insufficient stock for issue"), { code: "FEFO_STOCK_OUT" });
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
        qtyReq: Number(l.qtyReq),     // <- ensure numbers in JSON
        qtyIssued: Number(l.qtyIssued),
        notes: l.notes,
      })),
    });
  } catch (err) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Issue number already exists" });
    if (err?.code === "P2003") return res.status(400).json({ error: "Invalid fromLocId/toLocId foreign key" });
    if (err?.code === "FEFO_STOCK_OUT") return res.status(409).json({ error: "Insufficient stock (FEFO)" });
    console.error("[POST /issues]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
