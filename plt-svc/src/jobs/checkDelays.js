const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

if (!process.env.DATABASE_URL && process.env.PLT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.PLT_DATABASE_URL;
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ALERT_TYPES = {
  STATUS_DELAY: "STATUS_DELAY",
  ETA_MISSED: "ETA_MISSED",
};

async function ensureAlert(deliveryId, type, message) {
  const existing = await prisma.deliveryAlert.findFirst({
    where: { deliveryId, type, resolvedAt: null },
  });
  if (!existing) {
    await prisma.deliveryAlert.create({ data: { deliveryId, type, message } });
  } else if (existing.message !== message) {
    await prisma.deliveryAlert.update({
      where: { id: existing.id },
      data: { message },
    });
  }
}

async function run() {
  const now = new Date();
  console.log("=== DELIVERY DELAY SCAN START ===");

  const overdue = await prisma.delivery.findMany({
    where: {
      eta: { not: null, lt: now },
      status: { notIn: ["DELIVERED", "CANCELLED"] },
    },
    select: { id: true, eta: true, status: true, trackingNo: true },
  });

  for (const d of overdue) {
    const message = `Delivery ${d.id.toString()} missed ETA ${d.eta.toISOString()} (status ${d.status})`;
    await ensureAlert(d.id, ALERT_TYPES.ETA_MISSED, message);
    console.log(`Alerted -> ${message}`);
  }

  const toClear = await prisma.deliveryAlert.findMany({
    where: {
      type: ALERT_TYPES.ETA_MISSED,
      resolvedAt: null,
      OR: [
        { delivery: { status: { in: ["DELIVERED", "CANCELLED"] } } },
        {
          delivery: {
            eta: { gte: now },
            status: { notIn: ["DELIVERED", "CANCELLED"] },
          },
        },
      ],
    },
    select: { id: true },
  });

  for (const alert of toClear) {
    await prisma.deliveryAlert.update({
      where: { id: alert.id },
      data: { resolvedAt: now },
    });
    console.log(`Resolved ETA alert ${alert.id}`);
  }

  console.log("=== DELIVERY DELAY SCAN END ===");
}

run()
  .catch((err) => {
    console.error("[checkDelays] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
