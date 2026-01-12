const router = require("express").Router();
const { prisma } = require("../prisma");

function parsePoIds(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      try {
        return BigInt(entry);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry !== null);
}

router.get("/po-deliveries", async (req, res) => {
  try {
    const poIds = parsePoIds(req.query.poIds);
    if (!poIds.length) return res.json([]);

    const deliveries = await prisma.delivery.findMany({
      where: { poId: { in: poIds } },
      orderBy: { createdAt: "desc" },
      select: {
        poId: true,
        status: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const seen = new Set();
    const latest = [];
    for (const row of deliveries) {
      const key = row.poId?.toString();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      latest.push({
        poId: key,
        status: row.status,
        updatedAt: row.updatedAt,
        createdAt: row.createdAt,
      });
    }

    res.json(latest);
  } catch (err) {
    console.error("[internal] GET /po-deliveries", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
