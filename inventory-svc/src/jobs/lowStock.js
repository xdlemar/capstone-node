const { prisma } = require("../prisma");

// helper: stringify BigInt safely
const bi = (v) => (typeof v === "bigint" ? v.toString() : v);

async function run() {
  console.log("=== LOW-STOCK CHECK START ===");

  const now = new Date();

  const [levels, thresholds, items, locations, unresolved] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT
        i.id AS "itemId",
        l.id AS "locationId",
        COALESCE(SUM(CASE WHEN sm."toLocId"   = l.id THEN sm.qty END), 0) -
        COALESCE(SUM(CASE WHEN sm."fromLocId" = l.id THEN sm.qty END), 0) AS onhand
      FROM "Item" i
      JOIN "Location" l ON 1=1
      LEFT JOIN "StockMove" sm
        ON sm."itemId" = i.id
       AND (sm."toLocId" = l.id OR sm."fromLocId" = l.id)
      GROUP BY i.id, l.id
      ORDER BY i.id, l.id
    `),
    prisma.threshold.findMany(),
    prisma.item.findMany({ select: { id: true, sku: true, name: true } }),
    prisma.location.findMany({ select: { id: true, name: true } }),
    prisma.notification.findMany({ where: { resolvedAt: null, type: "LOW_STOCK" } }),
  ]);

  if (!thresholds.length) {
    console.log("No thresholds configured. Nothing to check.");
    console.log("=== LOW-STOCK CHECK END ===");
    return;
  }

  const itemMap = new Map(items.map((it) => [bi(it.id), it]));
  const locationMap = new Map(locations.map((loc) => [bi(loc.id), loc]));
  const thresholdMap = new Map(
    thresholds.map((t) => [`${bi(t.itemId)}:${bi(t.locationId)}`, t])
  );

  const unresolvedMap = new Map();
  for (const n of unresolved) {
    const key = `${bi(n.itemId)}:${n.locationId == null ? "*" : bi(n.locationId)}`;
    if (!unresolvedMap.has(key)) unresolvedMap.set(key, n);
  }

  const stillLow = new Set();

  if (!levels.length) {
    console.log("No stock movement rows yet. Nothing to check.");
  }

  for (const L of levels) {
    const itemId = BigInt(L.itemId);
    const locationId = BigInt(L.locationId);
    const key = `${bi(itemId)}:${bi(locationId)}`;
    const threshold = thresholdMap.get(key);
    if (!threshold) continue;

    const onhand = Number(L.onhand);
    const min = Number(threshold.minQty);
    const item = itemMap.get(bi(itemId));
    const location = locationMap.get(bi(locationId));
    const labelItem = item ? `${item.sku} (${item.name})` : `Item ${bi(itemId)}`;
    const labelLocation = location ? location.name : `Location ${bi(locationId)}`;
    const message = `Low stock: ${labelItem} at ${labelLocation} is ${onhand} below minimum ${min}`;

    if (onhand < min) {
      stillLow.add(key);
      const existing = unresolvedMap.get(key);
      if (!existing) {
        await prisma.notification.create({
          data: {
            type: "LOW_STOCK",
            itemId,
            locationId,
            message,
          },
        });
        console.log(`Created alert -> ${message}`);
      } else if (existing.message !== message) {
        await prisma.notification.update({
          where: { id: existing.id },
          data: { message },
        });
        console.log(`Updated alert -> ${message}`);
      }
    }
  }

  // auto-resolve alerts that are no longer in low-stock state
  for (const [key, notif] of unresolvedMap.entries()) {
    if (!stillLow.has(key)) {
      await prisma.notification.update({
        where: { id: notif.id },
        data: { resolvedAt: now },
      });
      console.log(`Resolved alert ${notif.id} (stock back to safe level).`);
    }
  }

  console.log("=== LOW-STOCK CHECK END ===");
}

run()
  .catch((err) => {
    console.error("[lowStock job] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
