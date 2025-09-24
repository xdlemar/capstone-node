const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

/**
 * GET /notifications?unresolved=true
 */
r.get("/", async (req, res) => {
  const unresolved = String(req.query.unresolved || "").toLowerCase() === "true";
  const rows = await prisma.notification.findMany({
    where: unresolved ? { resolvedAt: null } : {},
    orderBy: [{ id: "asc" }],
  });

  res.json(
    rows.map((n) => ({
      id: n.id.toString(),
      type: n.type,
      itemId: n.itemId ? n.itemId.toString() : null,
      locationId: n.locationId ? n.locationId.toString() : null,
      message: n.message,
      createdAt: n.createdAt,
      resolvedAt: n.resolvedAt,
    }))
  );
});

/**
 * POST /notifications/:id/resolve
 */
r.post("/:id/resolve", async (req, res) => {
  try {
    const idStr = req.params.id;
    if (!/^\d+$/.test(idStr)) return res.status(400).json({ error: "Invalid id" });
    const id = BigInt(idStr);

    const row = await prisma.notification.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });

    res.json({
      id: row.id.toString(),
      type: row.type,
      message: row.message,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
    });
  } catch (err) {
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Not found" });
    }
    console.error("[POST /notifications/:id/resolve]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
