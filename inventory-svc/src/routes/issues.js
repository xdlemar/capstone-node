const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const r = Router();

r.post("/", async (req, res) => {
  try {
    const { issueNo, fromLocId, toLocId, notes, lines = [] } = req.body || {};
    if (!issueNo || !fromLocId || !Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ error: "issueNo, fromLocId, lines[] required" });
    }

    const updated = await prisma.$transaction(async (p) => {
      // 1) create issue + lines (qtyIssued = 0 initially)
      const issue = await p.issue.create({
        data: {
          issueNo,
          fromLocId: BigInt(fromLocId),
          toLocId: toLocId ? BigInt(toLocId) : null,
          notes: notes ?? null,
          lines: {
            create: lines.map((ln) => ({
              itemId: BigInt(ln.itemId),
              qtyReq: ln.qty,   // Decimal column
              qtyIssued: 0,     // Decimal column
              notes: ln.notes ?? null,
            })),
          },
        },
        include: { lines: true },
      });

      // 2) create stock moves + set qtyIssued = qtyReq
      for (const ln of issue.lines) {
        await p.stockMove.create({
          data: {
            itemId: ln.itemId,
            fromLocId: issue.fromLocId,
            toLocId: issue.toLocId,
            qty: ln.qtyReq,          // Decimal column
            reason: "ISSUE",
            refType: "ISSUE",
            refId: issue.id,
            eventId: `issue:${issue.id.toString()}:${ln.id.toString()}`,
            occurredAt: new Date(),
          },
        });

        await p.issueLine.update({
          where: { id: ln.id },
          data: { qtyIssued: ln.qtyReq },
        });
      }

      // 3) re-read so we return the updated qtyIssued values
      return p.issue.findUnique({
        where: { id: issue.id },
        include: { lines: true },
      });
    });

    // 4) normalize Decimal -> number for API response
    res.status(201).json({
      id: updated.id.toString(),
      issueNo: updated.issueNo,
      fromLocId: updated.fromLocId.toString(),
      toLocId: updated.toLocId ? updated.toLocId.toString() : null,
      notes: updated.notes,
      createdAt: updated.createdAt,
      lines: updated.lines.map((l) => ({
        id: l.id.toString(),
        issueId: l.issueId.toString(),
        itemId: l.itemId.toString(),
        qtyReq: Number(l.qtyReq),
        qtyIssued: Number(l.qtyIssued),
        notes: l.notes,
      })),
    });
  } catch (err) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Issue number already exists" });
    if (err?.code === "P2003") return res.status(400).json({ error: "Invalid fromLocId/toLocId foreign key" });
    console.error("[POST /issues]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
