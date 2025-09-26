const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function computeVendorMetrics(vendorId, lookbackDays, targetLeadDays) {
  const windowStart = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const receipts = await prisma.receipt.findMany({
    where: {
      PO: {
        vendorId,
        orderedAt: { gte: windowStart },
      },
    },
    include: {
      PO: {
        select: { orderedAt: true, lines: { select: { qty: true, price: true } } },
      },
      lines: true,
    },
  });

  if (!receipts.length) {
    return {
      onTimePercentage: 0,
      avgLeadTimeDays: 0,
      fulfillmentRate: 0,
      totalSpend: 0,
    };
  }

  let onTime = 0;
  let leadSum = 0;
  let leadSamples = 0;
  let fulfilledLines = 0;
  let totalLines = 0;
  let totalSpend = 0;

  for (const receipt of receipts) {
    const orderedAt = receipt.PO?.orderedAt;
    const arrivalDate = receipt.arrivalDate || receipt.receivedAt;
    if (orderedAt) {
      const leadDays = (arrivalDate - orderedAt) / (1000 * 60 * 60 * 24);
      if (Number.isFinite(leadDays) && leadDays >= 0) {
        leadSum += leadDays;
        leadSamples += 1;
        if (leadDays <= targetLeadDays) onTime += 1;
      }
    }

    totalLines += receipt.lines.length;
    for (const line of receipt.lines) {
      if (line.qty > 0) fulfilledLines += 1;
    }

    const poLines = receipt.PO?.lines || [];
    for (const line of poLines) {
      totalSpend += Number(line.qty) * Number(line.price);
    }
  }

  return {
    onTimePercentage: leadSamples ? Number(((onTime / leadSamples) * 100).toFixed(2)) : 0,
    avgLeadTimeDays: leadSamples ? Number((leadSum / leadSamples).toFixed(2)) : 0,
    fulfillmentRate: totalLines ? Number(((fulfilledLines / totalLines) * 100).toFixed(2)) : 0,
    totalSpend: Number(totalSpend.toFixed(2)),
  };
}

async function run() {
  const lookbackDays = Number(process.env.VENDOR_LOOKBACK_DAYS || 90);
  const targetLeadDays = Number(process.env.VENDOR_TARGET_LEAD_DAYS || 7);

  console.log(`[vendor-metrics] recalculating metrics for all vendors over last ${lookbackDays} days`);
  const vendors = await prisma.vendor.findMany({ select: { id: true } });

  for (const vendor of vendors) {
    const metrics = await computeVendorMetrics(vendor.id, lookbackDays, targetLeadDays);
    await prisma.vendorMetric.upsert({
      where: { vendorId: vendor.id },
      update: {
        onTimePercentage: metrics.onTimePercentage,
        avgLeadTimeDays: metrics.avgLeadTimeDays,
        fulfillmentRate: metrics.fulfillmentRate,
        totalSpend: metrics.totalSpend,
        lastEvaluatedAt: new Date(),
      },
      create: {
        vendorId: vendor.id,
        onTimePercentage: metrics.onTimePercentage,
        avgLeadTimeDays: metrics.avgLeadTimeDays,
        fulfillmentRate: metrics.fulfillmentRate,
        totalSpend: metrics.totalSpend,
      },
    });
    console.log(`[vendor-metrics] vendor ${vendor.id.toString()} => onTime=${metrics.onTimePercentage}% lead=${metrics.avgLeadTimeDays} days`);
  }

  console.log("[vendor-metrics] completed");
}

run()
  .catch((err) => {
    console.error("[vendor-metrics] error", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
