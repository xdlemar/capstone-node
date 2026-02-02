const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

/**
 * Create/update an item by its unique SKU (idempotent).
 * If the SKU exists, we update name/unit/minQty and return 200.
 * If it's new, we create and return 201.
 */
r.post("/", async (req, res) => {
  try {
    const { sku, name, unit, minQty, strength, type } = req.body;

    if (!sku || !name || !unit) {
      return res.status(400).json({ error: "sku, name, unit are required" });
    }

    const normalizedType = String(type || "supply").trim().toLowerCase();

    // check if exists to pick a proper status code
    const existing = await prisma.item.findUnique({ where: { sku } });

    const item = await prisma.item.upsert({
      where: { sku },
      update: { name, unit, minQty, strength: strength ?? null, type: normalizedType },
      create: { sku, name, unit, minQty, strength: strength ?? null, type: normalizedType },
    });

    return res.status(existing ? 200 : 201).json(item);
  } catch (e) {
    // Prisma unique violation (just in case)
    if (e.code === "P2002") {
      return res.status(409).json({ error: "SKU already exists" });
    }
    console.error("[POST /items] error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

/**
 * List items (search optional)
 */
r.get("/", async (req, res) => {
  try {
    const q = String(req.query.search || "");
    const type = String(req.query.type || "").trim().toLowerCase();
    const items = await prisma.item.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(q
          ? {
              OR: [
                { sku: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { sku: "asc" },
    });
    res.json(items);
  } catch (e) {
    console.error("[GET /items] error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

/**
 * Delete an item by id (handy for cleanup in dev)
 */
r.delete("/:id", async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    await prisma.item.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Not found" });
    }
    console.error("[DELETE /items/:id] error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
