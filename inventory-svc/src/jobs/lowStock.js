const { prisma } = require("../prisma");

// helper: BigInt-safe print
const bi = (v) => (typeof v === "bigint" ? v.toString() : v);

async function run() {
  console.log("=== LOW-STOCK CHECK START ===");

  // Build per-location on-hand using location-aware conditional sums
  // This matches the logic from /reports/levels?locationId=
  const levels = await prisma.$queryRawUnsafe(`
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
  `);

  // Pull all thresholds once
  const thresholds = await prisma.threshold.findMany();

  if (!levels.length) {
    console.log("No stock movement rows yet. Nothing to check.");
    console.log("=== LOW-STOCK CHECK END ===");
    return;
  }
  if (!thresholds.length) {
    console.log("No thresholds configured. Nothing to check.");
    console.log("=== LOW-STOCK CHECK END ===");
    return;
  }

  console.log("Levels:");
  for (const L of levels) {
    console.log(`  item=${bi(L.itemId)} loc=${bi(L.locationId)} onhand=${Number(L.onhand)}`);
  }
  console.log("Thresholds:");
  for (const t of thresholds) {
    console.log(`  id=${bi(t.id)} item=${bi(t.itemId)} loc=${t.locationId == null ? "ANY" : bi(t.locationId)} min=${Number(t.minQty)}`);
  }

  let alerts = 0;
  for (const L of levels) {
    const itemId = BigInt(L.itemId);
    const locationId = L.locationId == null ? null : BigInt(L.locationId);
    const onhand = Number(L.onhand);

    const hits = thresholds.filter(
      (t) => t.itemId === itemId && (t.locationId === null || t.locationId === locationId)
    );

    for (const t of hits) {
      const min = Number(t.minQty);
      if (onhand < min) {
        alerts++;
        console.log(
          `[LOW-STOCK] item=${bi(itemId)} location=${locationId == null ? "ANY" : bi(locationId)} onhand=${onhand} < min=${min}`
        );
        // TODO: write to Notifications table in a later sprint
      }
    }
  }

  if (alerts === 0) console.log("No low-stock alerts.");
  console.log("=== LOW-STOCK CHECK END ===");
}

run().finally(() => process.exit(0));
