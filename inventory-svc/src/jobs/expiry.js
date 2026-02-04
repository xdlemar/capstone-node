const { prisma } = require("../prisma");

const WINDOW_DAYS = Number(process.env.EXPIRY_WINDOW_DAYS || 30);
const EXPIRE_PAST_DAYS = Number(process.env.EXPIRE_PAST_DAYS || 0);

async function ensureNotification(itemId, locationId, message) {
  // for expiry notifications we don't tie to a specific location (global risk)
  const existing = await prisma.notification.findFirst({
    where: { type: "EXPIRY", itemId, locationId: null, resolvedAt: null },
  });
  if (existing) return existing;

  return prisma.notification.create({
    data: {
      type: "EXPIRY",
      itemId,
      locationId: null,
      message,
    },
  });
}

async function run() {
  console.log("=== EXPIRY CHECK START ===");
  console.log(`Window: items expiring in <= ${WINDOW_DAYS} days`);

  const now = new Date();
  const to = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const pastCutoff = new Date(now.getTime() - EXPIRE_PAST_DAYS * 24 * 60 * 60 * 1000);

  // Look at Batches with qtyOnHand > 0 and expiryDate in window
  const batches = await prisma.batch.findMany({
    where: {
      qtyOnHand: { gt: "0" },
      expiryDate: { not: null, gte: now, lte: to },
    },
    include: { item: true },
    orderBy: { expiryDate: "asc" },
  });

  const expiredBatches = await prisma.batch.findMany({
    where: {
      qtyOnHand: { gt: "0" },
      expiryDate: { not: null, lt: now, gte: pastCutoff },
      status: { notIn: ["EXPIRED", "DISPOSED"] },
    },
    include: { item: true },
    orderBy: { expiryDate: "asc" },
  });

  if (!batches.length && !expiredBatches.length) {
    console.log("No batches near expiry.");
    console.log("=== EXPIRY CHECK END ===");
    process.exit(0);
    return;
  }

  for (const b of batches) {
    const msg = `EXPIRY item=${b.itemId.toString()} sku=${b.item.sku} lot=${b.lotNo ?? "-"} qty=${b.qtyOnHand.toString()} exp=${b.expiryDate?.toISOString().slice(0,10)}`;
    console.log(`[EXPIRY] ${msg}`);
    await ensureNotification(b.itemId, null, msg);
  }

  for (const b of expiredBatches) {
    const msg = `EXPIRED item=${b.itemId.toString()} sku=${b.item.sku} lot=${b.lotNo ?? "-"} qty=${b.qtyOnHand.toString()} exp=${b.expiryDate?.toISOString().slice(0,10)}`;
    console.log(`[EXPIRED] ${msg}`);
    await prisma.batch.update({
      where: { id: b.id },
      data: { status: "EXPIRED", expiredAt: now },
    });
    await ensureNotification(b.itemId, null, msg);
  }

  console.log("=== EXPIRY CHECK END ===");
  process.exit(0);
}

run().catch((e) => {
  console.error("Expiry job failed:", e);
  process.exit(1);
});
