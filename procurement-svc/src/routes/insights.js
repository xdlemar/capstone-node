const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { requireRole } = require("../auth");

const managerAccess = requireRole("MANAGER", "ADMIN");
const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

router.get("/insights", staffAccess, async (_req, res) => {
  try {
    const [pos, poLines] = await Promise.all([
      prisma.pO.findMany({
        select: {
          id: true,
          vendorId: true,
          vendor: { select: { id: true, name: true, email: true, phone: true } },
          orderedAt: true,
        },
      }),
      prisma.pOLine.findMany({
        select: {
          itemId: true,
          qty: true,
          PO: {
            select: {
              vendorId: true,
              vendor: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    const vendorStats = new Map();
    for (const po of pos) {
      if (!po.vendorId) continue;
      const vendorId = po.vendorId.toString();
      const vendorName = po.vendor?.name || "Unknown";
      const stat = vendorStats.get(vendorId) || {
        vendorId,
        vendorName,
        contact: {
          email: po.vendor?.email || null,
          phone: po.vendor?.phone || null,
        },
        orderCount: 0,
        totalQty: 0,
      };
      stat.orderCount += 1;
      vendorStats.set(vendorId, stat);
    }

    const itemTotals = new Map();
    for (const line of poLines) {
      const qty = Number(line.qty || 0);
      if (!qty) continue;
      const itemId = line.itemId.toString();
      const item = itemTotals.get(itemId) || { itemId, totalQty: 0, orderLines: 0 };
      item.totalQty += qty;
      item.orderLines += 1;
      itemTotals.set(itemId, item);

      if (line.PO?.vendorId) {
        const vendorId = line.PO.vendorId.toString();
        const vendorName = line.PO.vendor?.name || "Unknown";
        const stat = vendorStats.get(vendorId) || {
          vendorId,
          vendorName,
          contact: {
            email: line.PO.vendor?.email || null,
            phone: line.PO.vendor?.phone || null,
          },
          orderCount: 0,
          totalQty: 0,
        };
        stat.totalQty += qty;
        vendorStats.set(vendorId, stat);
      }
    }

    const topVendorsByOrders = Array.from(vendorStats.values())
      .sort((a, b) => b.orderCount - a.orderCount || b.totalQty - a.totalQty)
      .slice(0, 10);

    const topItemsByQty = Array.from(itemTotals.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 15);

    res.json({
      topVendorsByOrders,
      topItemsByQty,
    });
  } catch (err) {
    console.error("[GET /procurement/insights]", err);
    res.status(500).json({ error: "Failed to load supplier insights" });
  }
});

module.exports = router;
