const { prisma } = require("../prisma");

/**
 * Current on-hand.
 * - If locationId is provided: on-hand AT that location for each item.
 * - If not: global on-hand per item across all locations.
 */
async function currentLevels(locationId) {
  if (locationId) {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT i.id AS "itemId", i.sku, i.name,
        COALESCE(SUM(CASE WHEN sm."toLocId"   = $1 THEN sm.qty ELSE 0 END),0) -
        COALESCE(SUM(CASE WHEN sm."fromLocId" = $1 THEN sm.qty ELSE 0 END),0) AS onhand
      FROM "StockMove" sm
      JOIN "Item" i ON i.id = sm."itemId"
      GROUP BY i.id, i.sku, i.name
      ORDER BY i.sku ASC
    `, locationId);
    return rows.map(r => ({ ...r, onhand: Number(r.onhand) }));
  } else {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT i.id AS "itemId", i.sku, i.name,
        COALESCE(SUM(CASE WHEN sm."toLocId"   IS NOT NULL THEN sm.qty ELSE 0 END),0) -
        COALESCE(SUM(CASE WHEN sm."fromLocId" IS NOT NULL THEN sm.qty ELSE 0 END),0) AS onhand
      FROM "StockMove" sm
      JOIN "Item" i ON i.id = sm."itemId"
      GROUP BY i.id, i.sku, i.name
      ORDER BY i.sku ASC
    `);
    return rows.map(r => ({ ...r, onhand: Number(r.onhand) }));
  }
}

async function applyStockMove(data) {
  if (!data.fromLocId && !data.toLocId) throw new Error("fromLocId or toLocId required");
  if (Number(data.qty) <= 0) throw new Error("qty must be > 0");

  // idempotency
  if (data.eventId) {
    const dup = await prisma.stockMove.findFirst({ where: { eventId: data.eventId } });
    if (dup) return dup;
  }

  return prisma.stockMove.create({
    data: {
      itemId: BigInt(data.itemId),
      batchId: data.batchId ? BigInt(data.batchId) : null,
      fromLocId: data.fromLocId ? BigInt(data.fromLocId) : null,
      toLocId: data.toLocId ? BigInt(data.toLocId) : null,
      qty: Number(data.qty),
      reason: String(data.reason),
      refType: data.refType ?? null,
      refId: data.refId ? BigInt(data.refId) : null,
      eventId: data.eventId ?? null,
    },
  });
}

module.exports = { currentLevels, applyStockMove };
