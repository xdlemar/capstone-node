const prisma = require("../prisma");

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatStamp(date) {
  return date
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
}

async function generateWorkOrderNo(assetCode) {
  const base = assetCode ? assetCode.replace(/[^A-Z0-9]+/gi, "").toUpperCase().slice(0, 6) : "GEN";
  return `WO-${base}-${formatStamp(new Date())}`;
}

async function run() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const schedules = await prisma.maintenanceSchedule.findMany({
    where: {
      nextDue: {
        lte: dayEnd,
      },
    },
    include: { asset: true },
  });

  if (!schedules.length) {
    console.log("[alms] schedule job: no due schedules");
    return;
  }

  for (const schedule of schedules) {
    if (!schedule.nextDue) continue;
    const dueStart = startOfDay(schedule.nextDue);
    const dueEnd = endOfDay(schedule.nextDue);

    const existing = await prisma.maintenanceWorkOrder.findFirst({
      where: {
        assetId: schedule.assetId,
        type: schedule.type,
        scheduledAt: {
          gte: dueStart,
          lt: dueEnd,
        },
      },
    });

    if (existing) {
      continue;
    }

    const woNo = await generateWorkOrderNo(schedule.asset?.assetCode);
    await prisma.maintenanceWorkOrder.create({
      data: {
        woNo,
        assetId: schedule.assetId,
        type: schedule.type,
        status: "OPEN",
        scheduledAt: schedule.nextDue,
        notes: schedule.notes ? `Auto-created from schedule. ${schedule.notes}` : "Auto-created from schedule.",
      },
    });

    await prisma.asset.update({
      where: { id: schedule.assetId },
      data: { status: "UNDER_MAINTENANCE" },
    });

    const interval = schedule.intervalDays ? Number(schedule.intervalDays) : null;
    const nextDue = interval && Number.isFinite(interval)
      ? addDays(schedule.nextDue, interval)
      : null;

    await prisma.maintenanceSchedule.update({
      where: { id: schedule.id },
      data: { nextDue },
    });
  }

  console.log(`[alms] schedule job: processed ${schedules.length} schedule(s)`);
}

run()
  .catch((err) => {
    console.error("[alms] schedule job failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (_err) {
      // noop
    }
  });
