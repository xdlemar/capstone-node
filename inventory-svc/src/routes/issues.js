const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const r = Router();

/**
 * POST /issues
 * { issueNo, fromLocId, toLocId?, notes?, lines: [{ itemId, qty, notes? }] }
 */
r.post("/", async (req, res) => {
  try {
    const { issueNo, fromLocId, toLocId, notes, lines = [] } = req.body || {};
    if (!issueNo || !fromLocId || !Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ error: "issueNo, fromLocId, lines[] required" });
    }

    const created = await prisma.$transaction(async (p) => {
      const issue = await p.issue.create({
        data: {
          issueNo,
          fromLocId: BigInt(fromLocId),
          toLocId: toLocId ? BigInt(toLocId) : null,
          notes: notes ?? null,
          lines: {
            create: lines.map((ln) => ({
              itemId: BigInt(ln.itemId),
              qtyReq: ln.qty,            // <-- important
              qtyIssued: 0,
              notes: ln.notes ?? null,
            })),
          },
        },
        include: { lines: true },
      });

      // create stock move(s) now (ISSUE); simple total = sum(qtyReq)
      for (const ln of issue.lines) {
        await p.stockMove.create({
          data: {
            itemId: ln.itemId,
            fromLocId: issue.fromLocId,
            toLocId: issue.toLocId,
            qty: ln.qtyReq,
            reason: "ISSUE",
            refType: "ISSUE",
            refId: issue.id,
            eventId: `issue:${issue.id.toString()}:${ln.id.toString()}`,
            occurredAt: new Date(),
          },
        });

        // record issued qty
        await p.issueLine.update({
          where: { id: ln.id },
          data: { qtyIssued: ln.qtyReq },
        });
      }

      return issue;
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
        qtyReq: l.qtyReq,
        qtyIssued: l.qtyIssued,
        notes: l.notes,
      })),
    });
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Issue number already exists" });
    }
    if (err?.code === "P2003") {
      return res.status(400).json({ error: "Invalid fromLocId/toLocId foreign key" });
    }
    console.error("[POST /issues]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
