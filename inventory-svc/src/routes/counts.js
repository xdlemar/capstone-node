const { Router } = require("express");
const { prisma } = require("../prisma");

const r = Router();

function parseBigInt(value, field) {
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

/**
 * POST /counts
 * { sessionNo, locationId, notes?, lines: [{ itemId, countedQty, systemQty, variance, notes? }] }
 */
r.post("/", async (req, res) => {
  try {
    const { sessionNo, locationId, notes, lines = [] } = req.body || {};
    if (!sessionNo || !locationId) {
      return res.status(400).json({ error: "sessionNo, locationId required" });
    }

    const locationIdBig = parseBigInt(locationId, "locationId");
    const normalizedLines = lines.map((ln, idx) => {
      const lineNo = idx + 1;
      return {
        itemId: parseBigInt(ln.itemId, `lines[${lineNo}].itemId`),
        countedQty: ln.countedQty ?? 0,
        systemQty: ln.systemQty ?? 0,
        variance: ln.variance ?? 0,
        notes: ln.notes ?? null,
      };
    });

    const created = await prisma.countSession.create({
      data: {
        sessionNo,
        locationId: locationIdBig,
        status: "OPEN",
        notes: notes ?? null,
        lines: {
          create: normalizedLines,
        },
      },
      include: { lines: true },
    });

    res.status(201).json({
      id: created.id.toString(),
      sessionNo: created.sessionNo,
      locationId: created.locationId.toString(),
      status: created.status,
      notes: created.notes,
      createdAt: created.createdAt,
      lines: created.lines.map((l) => ({
        id: l.id.toString(),
        itemId: l.itemId.toString(),
        countedQty: l.countedQty,
        systemQty: l.systemQty,
        variance: l.variance,
        notes: l.notes,
      })),
    });
  } catch (err) {
    if (err?.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Session already exists" });
    }
    if (err?.code === "P2003") {
      return res.status(400).json({ error: "Invalid locationId" });
    }
    console.error("[POST /counts]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

/**
 * POST /counts/:sessionNo/post
 */
r.post("/:sessionNo/post", async (req, res) => {
  try {
    const { sessionNo } = req.params;
    const session = await prisma.countSession.findUnique({
      where: { sessionNo },
      include: { lines: true },
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status === "POSTED") {
      return res.status(409).json({ error: "Already posted" });
    }

    await prisma.$transaction(async (p) => {
      for (const ln of session.lines) {
        if (!ln.variance) continue;
        const qty = Math.abs(Number(ln.variance));
        if (!Number.isFinite(qty) || qty === 0) continue;
        const out = Number(ln.variance) < 0;

        await p.stockMove.create({
          data: {
            itemId: ln.itemId,
            fromLocId: out ? session.locationId : null,
            toLocId: out ? null : session.locationId,
            qty: qty.toString(),
            reason: "ADJUSTMENT",
            refType: "COUNT",
            refId: session.id,
            eventId: `count:${session.sessionNo}:${ln.id.toString()}:${out ? "out" : "in"}`,
            occurredAt: new Date(),
          },
        });
      }

      await p.countSession.update({
        where: { id: session.id },
        data: { status: "POSTED" },
      });
    });

    const posted = await prisma.countSession.findUnique({
      where: { sessionNo },
      include: { lines: true },
    });

    res.json({
      id: posted.id.toString(),
      sessionNo: posted.sessionNo,
      locationId: posted.locationId.toString(),
      status: posted.status,
      notes: posted.notes,
      createdAt: posted.createdAt,
      lines: posted.lines.map((l) => ({
        id: l.id.toString(),
        itemId: l.itemId.toString(),
        countedQty: l.countedQty,
        systemQty: l.systemQty,
        variance: l.variance,
        notes: l.notes,
      })),
    });
  } catch (err) {
    console.error("[POST /counts/:sessionNo/post]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
