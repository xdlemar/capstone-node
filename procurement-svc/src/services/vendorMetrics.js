const { prisma } = require("../prisma");

const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_TARGET_LEAD_DAYS = 7;

function clampNumber(value, { min, max, fallback }) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

async function computeVendorMetrics(vendorId, { lookbackDays = DEFAULT_LOOKBACK_DAYS, targetLeadDays = DEFAULT_TARGET_LEAD_DAYS } = {}) {
  const vendorIdBig = BigInt(vendorId);
  const windowStart = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const receipts = await prisma.receipt.findMany({
    where: {
      PO: {
        vendorId: vendorIdBig,
        orderedAt: { gte: windowStart },
      },
    },
    include: {
      PO: {
        select: { orderedAt: true },
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
      lookbackDays,
    };
  }

  let onTime = 0;
  let leadSum = 0;
  let totalLeadSamples = 0;
  let fulfilledLines = 0;
  let totalLines = 0;
  let totalSpend = 0;

  for (const receipt of receipts) {
    const orderedAt = receipt.PO?.orderedAt;
    const arrivalDate = receipt.arrivalDate || receipt.receivedAt;
    if (orderedAt) {
      const diffMs = arrivalDate - orderedAt;
      const leadDays = diffMs / (1000 * 60 * 60 * 24);
      if (Number.isFinite(leadDays) && leadDays >= 0) {
        leadSum += leadDays;
        totalLeadSamples += 1;
        if (leadDays <= targetLeadDays) {
          onTime += 1;
        }
      }
    }

    totalLines += receipt.lines.length;
    for (const line of receipt.lines) {
      if (line.qty > 0) {
        fulfilledLines += 1;
      }
    }

    const po = await prisma.pO.findUnique({
      where: { id: receipt.poId },
      select: {
        lines: {
          select: {
            qty: true,
            price: true,
          },
        },
      },
    });

    if (po) {
      for (const line of po.lines) {
        const lineTotal = Number(line.qty) * Number(line.price);
        if (Number.isFinite(lineTotal)) {
          totalSpend += lineTotal;
        }
      }
    }
  }

  return {
    onTimePercentage: totalLeadSamples ? Number(((onTime / totalLeadSamples) * 100).toFixed(2)) : 0,
    avgLeadTimeDays: totalLeadSamples ? Number((leadSum / totalLeadSamples).toFixed(2)) : 0,
    fulfillmentRate: totalLines ? Number(((fulfilledLines / totalLines) * 100).toFixed(2)) : 0,
    totalSpend: Number(totalSpend.toFixed(2)),
    lookbackDays,
  };
}

async function computeMetricsForAll({ lookbackDays, targetLeadDays } = {}) {
  const vendors = await prisma.vendor.findMany({ select: { id: true } });
  const results = [];

  for (const vendor of vendors) {
    const metrics = await computeVendorMetrics(vendor.id, { lookbackDays, targetLeadDays });
    results.push({ vendorId: vendor.id, ...metrics });
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
  }

  return results;
}

module.exports = {
  computeVendorMetrics,
  computeMetricsForAll,
  clampNumber,
};
