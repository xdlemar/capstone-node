const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { requireRole } = require("../auth");

const managerAccess = requireRole("MANAGER", "ADMIN");

router.get("/insights", managerAccess, async (_req, res) => {
  try {
    const [vendorMetrics, poLines] = await Promise.all([
      prisma.vendorMetric.findMany({
        include: {
          vendor: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { totalSpend: "desc" },
        take: 10,
      }),
      prisma.pOLine.findMany({
        where: { price: { gt: 0 } },
        select: {
          itemId: true,
          qty: true,
          price: true,
          PO: {
            select: {
              vendorId: true,
              vendor: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    const topVendorsBySpend = vendorMetrics.map((metric) => ({
      vendorId: metric.vendorId.toString(),
      vendorName: metric.vendor?.name || "Unknown",
      contact: {
        email: metric.vendor?.email || null,
        phone: metric.vendor?.phone || null,
      },
      totalSpend: Number(metric.totalSpend || 0),
      onTimePercentage: metric.onTimePercentage,
      avgLeadTimeDays: metric.avgLeadTimeDays,
      fulfillmentRate: metric.fulfillmentRate,
      lastEvaluatedAt: metric.lastEvaluatedAt,
    }));

    const itemVendorStats = new Map();
    const vendorTotals = new Map();

    for (const line of poLines) {
      if (!line.PO?.vendorId) continue;
      const itemId = line.itemId.toString();
      const vendorId = line.PO.vendorId.toString();
      const vendorName = line.PO.vendor?.name || "Unknown";
      const qty = Number(line.qty || 0);
      const price = Number(line.price || 0);
      if (!qty || !Number.isFinite(price)) continue;

      const itemStat = itemVendorStats.get(itemId) || new Map();
      const vendorStat = itemStat.get(vendorId) || { vendorId, vendorName, qty: 0, spend: 0 };
      vendorStat.qty += qty;
      vendorStat.spend += price * qty;
      itemStat.set(vendorId, vendorStat);
      itemVendorStats.set(itemId, itemStat);

      const vendorTotal = vendorTotals.get(vendorId) || { vendorName, spend: 0 };
      vendorTotal.spend += price * qty;
      vendorTotals.set(vendorId, vendorTotal);
    }

    const priceLeaders = [];

    for (const [itemId, vendorMap] of itemVendorStats.entries()) {
      const vendors = Array.from(vendorMap.values()).filter((v) => v.qty > 0);
      if (vendors.length === 0) continue;
      const enriched = vendors.map((vendor) => ({
        vendorId: vendor.vendorId,
        vendorName: vendor.vendorName,
        avgPrice: vendor.spend / vendor.qty,
      }));
      enriched.sort((a, b) => a.avgPrice - b.avgPrice);
      const best = enriched[0];
      const average = enriched.reduce((sum, v) => sum + v.avgPrice, 0) / enriched.length;
      const delta = average > 0 ? ((average - best.avgPrice) / average) * 100 : 0;

      priceLeaders.push({
        itemId,
        bestVendor: best,
        averagePrice: average,
        savingsPercent: Number(delta.toFixed(2)),
      });
    }

    priceLeaders.sort((a, b) => b.savingsPercent - a.savingsPercent);

    const vendorSpendShare = Array.from(vendorTotals.entries())
      .map(([vendorId, value]) => ({
        vendorId,
        vendorName: value.vendorName,
        totalSpend: Number(value.spend.toFixed(2)),
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10);

    res.json({
      topVendorsBySpend,
      vendorSpendShare,
      priceLeaders: priceLeaders.slice(0, 15),
    });
  } catch (err) {
    console.error("[GET /procurement/insights]", err);
    res.status(500).json({ error: "Failed to load supplier insights" });
  }
});

module.exports = router;
