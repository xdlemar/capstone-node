const { Router } = require("express");
const prisma = require("../prisma.js");
const { requireRole } = require("../auth");
const { fetchPoDeliveryStatuses } = require("../pltClient");

const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

const router = Router();

router.get("/procurement", staffAccess, async (req, res) => {
  try {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];

    const [prs, vendors, pos, vendorOrders] = await Promise.all([
      prisma.pR.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          prNo: true,
          status: true,
          createdAt: true,
          notes: true,
          lines: {
            select: {
              id: true,
              itemId: true,
              qty: true,
              unit: true,
              notes: true,
            },
          },
          _count: { select: { PO: true } },
        },
      }),
      prisma.vendor.findMany({
        orderBy: { name: "asc" },
        include: roles.includes("MANAGER") || roles.includes("ADMIN") ? { metrics: true } : undefined,
      }),
      prisma.pO.findMany({
        where: { status: { in: ["OPEN", "PARTIAL"] } },
        orderBy: { orderedAt: "desc" },
        take: 75,
        include: {
          vendor: { select: { name: true } },
          PR: { select: { prNo: true } },
          lines: {
            select: {
              id: true,
              itemId: true,
              qty: true,
              unit: true,
              notes: true,
            },
          },
          _count: { select: { receipts: true } },
        },
      }),
      prisma.pO.findMany({
        select: {
          id: true,
          vendorId: true,
          lines: { select: { qty: true } },
        },
      }),
    ]);

    const mapPr = (status, { excludeWithPo = false } = {}) =>
      prs
        .filter(
          (pr) => pr.status === status && (!excludeWithPo || (pr._count?.PO ?? 0) === 0)
        )
        .map((pr) => ({
          id: pr.id.toString(),
          prNo: pr.prNo,
          createdAt: pr.createdAt,
          notes: pr.notes,
          lines: pr.lines.map((line) => ({
            id: line.id.toString(),
            itemId: line.itemId.toString(),
            qty: line.qty,
            unit: line.unit,
            notes: line.notes,
          })),
        }));

    const submittedPrs = mapPr("SUBMITTED");
    const approvedPrs = mapPr("APPROVED", { excludeWithPo: true });

    const vendorOrderStats = new Map();
    vendorOrders.forEach((po) => {
      if (!po.vendorId) return;
      const vendorId = po.vendorId.toString();
      const stat = vendorOrderStats.get(vendorId) || { orderCount: 0, totalQty: 0 };
      stat.orderCount += 1;
      const qty = po.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
      stat.totalQty += qty;
      vendorOrderStats.set(vendorId, stat);
    });

    const vendorPayload = vendors.map((vendor) => {
      const stats = vendorOrderStats.get(vendor.id.toString()) || { orderCount: 0, totalQty: 0 };
      return ({
      id: vendor.id.toString(),
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      metrics: vendor.metrics
        ? {
            onTimePercentage: vendor.metrics.onTimePercentage,
            avgLeadTimeDays: vendor.metrics.avgLeadTimeDays,
            fulfillmentRate: vendor.metrics.fulfillmentRate,
            totalSpend: Number(vendor.metrics.totalSpend),
            lastEvaluatedAt: vendor.metrics.lastEvaluatedAt,
      }
        : null,
      orderCount: stats.orderCount,
      totalQty: Number(stats.totalQty.toFixed(2)),
    });
    });

    let deliveryStatusMap = new Map();
    if (pos.length) {
      try {
        const statuses = await fetchPoDeliveryStatuses(pos.map((po) => po.id.toString()));
        deliveryStatusMap = new Map(statuses.map((row) => [String(row.poId), row.status]));
      } catch (err) {
        console.error("[GET /lookups/procurement] delivery status lookup failed", err);
        deliveryStatusMap = new Map();
      }
    }

    const openPos = pos
      .map((po) => {
        const deliveryStatus = deliveryStatusMap.get(po.id.toString()) ?? null;
        return {
          id: po.id.toString(),
          poNo: po.poNo,
          prNo: po.PR?.prNo ?? null,
          vendorName: po.vendor?.name ?? null,
          status: po.status,
          orderedAt: po.orderedAt,
          deliveryStatus,
          receiptCount: po._count?.receipts ?? 0,
          lines: po.lines.map((line) => ({
            id: line.id.toString(),
            itemId: line.itemId.toString(),
            qty: line.qty,
            unit: line.unit,
            notes: line.notes,
          })),
        };
      })
      .filter((po) => po.deliveryStatus === "DELIVERED" && po.receiptCount === 0);

    res.json({ submittedPrs, approvedPrs, vendors: vendorPayload, openPos });
  } catch (err) {
    console.error("[GET /lookups/procurement]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/po-options", staffAccess, async (_req, res) => {
  try {
    const pos = await prisma.pO.findMany({
      orderBy: { orderedAt: "desc" },
      take: 100,
      include: {
        vendor: { select: { name: true } },
        PR: { select: { prNo: true } },
      },
    });

    res.json(
      pos.map((po) => ({
        id: po.id.toString(),
        poNo: po.poNo,
        prNo: po.PR?.prNo ?? null,
        vendorName: po.vendor?.name ?? null,
        status: po.status,
        orderedAt: po.orderedAt,
      }))
    );
  } catch (err) {
    console.error("[GET /lookups/po-options]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
