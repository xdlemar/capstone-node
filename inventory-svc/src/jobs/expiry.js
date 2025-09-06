const { prisma } = require("../prisma");
require("dotenv").config();

async function run() {
  const days = Number(process.env.ALERT_EXPIRY_DAYS || 30);
  const soon = new Date(Date.now() + days * 24 * 3600 * 1000);
  const batches = await prisma.batch.findMany({
    where: { expiryDate: { lte: soon } },
    include: { item: true },
    orderBy: { expiryDate: "asc" }
  });
  for (const b of batches) {
    console.log(`[EXPIRY] ${b.item.sku} lot=${b.lotNo || "-"} exp=${b.expiryDate?.toISOString()}`);
    // TODO: notifications
  }
}

run().finally(() => process.exit(0));
