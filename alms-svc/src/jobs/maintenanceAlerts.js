const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

if (!process.env.DATABASE_URL && process.env.ALMS_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.ALMS_DATABASE_URL;
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ALERT_TYPES = {
  OVERDUE: "OVERDUE_MAINTENANCE",
  WARRANTY: "WARRANTY_EXPIRING",
};

function buildScheduleWhere(scheduleId) {
  return scheduleId ? { scheduleId } : { scheduleId: null };
}

async function ensureAlert({ assetId, scheduleId = null, type, message }) {
  const existing = await prisma.maintenanceAlert.findFirst({
    where: {
      assetId,
      type,
      resolvedAt: null,
      ...buildScheduleWhere(scheduleId),
    },
  });

  if (!existing) {
    await prisma.maintenanceAlert.create({
      data: { assetId, scheduleId, type, message },
    });
  } else if (existing.message !== message) {
    await prisma.maintenanceAlert.update({
      where: { id: existing.id },
      data: { message },
    });
  }
}

async function run() {
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  console.log("=== MAINTENANCE ALERT SCAN START ===");

  const overdue = await prisma.maintenanceSchedule.findMany({
    where: {
      nextDue: { not: null, lte: now },
    },
    select: {
      id: true,
      assetId: true,
      nextDue: true,
      type: true,
      asset: { select: { assetCode: true } },
    },
  });

  for (const sched of overdue) {
    const message = `Maintenance overdue: ${sched.asset.assetCode} was due ${sched.nextDue.toISOString()}`;
    await ensureAlert({
      assetId: sched.assetId,
      scheduleId: sched.id,
      type: ALERT_TYPES.OVERDUE,
      message,
    });
    console.log(`Overdue -> ${message}`);
  }

  const resolvedOverdue = await prisma.maintenanceAlert.findMany({
    where: {
      type: ALERT_TYPES.OVERDUE,
      resolvedAt: null,
      schedule: {
        OR: [
          { nextDue: null },
          { nextDue: { gt: now } },
        ],
      },
    },
    select: { id: true },
  });

  for (const alert of resolvedOverdue) {
    await prisma.maintenanceAlert.update({
      where: { id: alert.id },
      data: { resolvedAt: now },
    });
    console.log(`Resolved overdue alert ${alert.id}`);
  }

  const warrantyAssets = await prisma.asset.findMany({
    where: {
      warrantyUntil: { not: null, lte: soon },
    },
    select: { id: true, assetCode: true, warrantyUntil: true },
  });

  for (const asset of warrantyAssets) {
    const exp = asset.warrantyUntil;
    const status = exp < now ? "expired" : "expiring";
    const message = `Warranty ${status} for ${asset.assetCode}: ${exp.toISOString()}`;
    await ensureAlert({
      assetId: asset.id,
      type: ALERT_TYPES.WARRANTY,
      message,
    });
    console.log(`Warranty -> ${message}`);
  }

  const clearWarranty = await prisma.maintenanceAlert.findMany({
    where: {
      type: ALERT_TYPES.WARRANTY,
      resolvedAt: null,
      OR: [
        { asset: { warrantyUntil: null } },
        { asset: { warrantyUntil: { gt: soon } } },
      ],
    },
    select: { id: true },
  });

  for (const alert of clearWarranty) {
    await prisma.maintenanceAlert.update({
      where: { id: alert.id },
      data: { resolvedAt: now },
    });
    console.log(`Resolved warranty alert ${alert.id}`);
  }

  console.log("=== MAINTENANCE ALERT SCAN END ===");
}

run()
  .catch((err) => {
    console.error("[maintenanceAlerts] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
