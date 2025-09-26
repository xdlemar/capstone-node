const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

if (!process.env.DATABASE_URL && process.env.ALMS_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.ALMS_DATABASE_URL;
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function firstDayOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date, months) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  return d;
}

function monthsBetween(start, end) {
  return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
}

async function run() {
  const now = new Date();
  const currentPeriod = firstDayOfMonth(now);
  console.log("[financialSnapshots] Start run at", now.toISOString());

  const assets = await prisma.asset.findMany({
    select: { id: true },
  });

  for (const asset of assets) {
    await prisma.$transaction(async (tx) => {
      const record = await tx.asset.findUnique({
        where: { id: asset.id },
        include: {
          depreciation: true,
        },
      });
      if (!record) return;

      const dep = record.depreciation;
      const hasDepreciation = dep && dep.method !== "NONE" && dep.lifeMonths && dep.lifeMonths > 0 && record.acquisitionCost != null;

      if (!hasDepreciation && !record.acquisitionCost) {
        return;
      }

      const startBase = dep?.startedAt || record.purchaseDate || record.createdAt;
      if (!startBase) return;

      const startPeriod = firstDayOfMonth(startBase);
      let nextPeriod = dep?.lastPostedPeriod ? addMonths(firstDayOfMonth(dep.lastPostedPeriod), 1) : startPeriod;
      if (nextPeriod < startPeriod) nextPeriod = startPeriod;

      let accumulated = Number(dep?.accumulated ?? 0);
      let lastPeriodCreated = null;

      while (nextPeriod < currentPeriod) {
        const monthsSinceStart = monthsBetween(startPeriod, nextPeriod);
        const periodEnd = addMonths(nextPeriod, 1);

        let depreciationAmount = 0;
        if (hasDepreciation && monthsSinceStart < dep.lifeMonths) {
          const baseValue = Number(record.acquisitionCost ?? 0) - Number(dep.salvage ?? 0);
          const monthly = baseValue / dep.lifeMonths;
          if (Number.isFinite(monthly) && monthly > 0) {
            depreciationAmount = Number(monthly.toFixed(2));
            accumulated += depreciationAmount;
            if (accumulated > baseValue) {
              depreciationAmount -= accumulated - baseValue;
              accumulated = baseValue;
            }
          }
        }

        const maintenanceAgg = await tx.repairLog.aggregate({
          where: {
            assetId: record.id,
            repairedAt: {
              gte: nextPeriod,
              lt: periodEnd,
            },
          },
          _sum: { cost: true },
        });
        const maintenanceCost = Number(maintenanceAgg._sum.cost ?? 0);

        const bookValueBase = Number(record.acquisitionCost ?? 0);
        const bookValue = bookValueBase ? Number((bookValueBase - accumulated).toFixed(2)) : 0;

        await tx.assetFinancialSnapshot.upsert({
          where: {
            assetId_periodStart: {
              assetId: record.id,
              periodStart: nextPeriod,
            },
          },
          update: {
            depreciation: depreciationAmount,
            maintenanceCost,
            bookValue,
          },
          create: {
            assetId: record.id,
            periodStart: nextPeriod,
            periodEnd,
            depreciation: depreciationAmount,
            maintenanceCost,
            bookValue,
          },
        });

        lastPeriodCreated = nextPeriod;
        nextPeriod = periodEnd;

        if (hasDepreciation && accumulated >= (Number(record.acquisitionCost ?? 0) - Number(dep.salvage ?? 0))) {
          break;
        }
      }

      if (hasDepreciation && lastPeriodCreated) {
        await tx.assetDepreciation.update({
          where: { assetId: record.id },
          data: {
            accumulated,
            lastPostedPeriod: lastPeriodCreated,
          },
        });
      }
    });
  }

  console.log("[financialSnapshots] Completed run");
}

run()
  .catch((err) => {
    console.error("[financialSnapshots] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
