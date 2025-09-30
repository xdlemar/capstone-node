const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { requireRole } = require("../auth");

const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

router.get("/dashboard/summary", staffAccess, async (_req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const thirtyDaysAhead = new Date(now);
    thirtyDaysAhead.setDate(now.getDate() + 30);

    const [lowStock, expiringSoon, openCounts, notifications] = await Promise.all([
      prisma.notification.count({
        where: { type: "LOW_STOCK", resolvedAt: null },
      }),
      prisma.notification.count({
        where: {
          type: "EXPIRY",
          resolvedAt: null,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.countSession.count({ where: { status: "OPEN" } }),
      prisma.notification.findMany({
        where: { resolvedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          message: true,
          createdAt: true,
        },
      }),
    ]);

    const buckets = new Array(7).fill(0);
    const moves = await prisma.stockMove.findMany({
      where: {
        occurredAt: { gte: sevenDaysAgo },
      },
      select: { occurredAt: true, qty: true },
    });

    for (const move of moves) {
      const occurred = new Date(move.occurredAt);
      const dayIndex = Math.floor((startOfDay(occurred) - startOfDay(sevenDaysAgo)) / 86400000);
      if (dayIndex >= 0 && dayIndex < buckets.length) {
        const qty = Number(move.qty || 0);
        buckets[dayIndex] += Number.isFinite(qty) ? Math.abs(qty) : 0;
      }
    }

    const expiringBatches = await prisma.batch.count({
      where: {
        expiryDate: {
          not: null,
          gte: startOfDay(now),
          lte: thirtyDaysAhead,
        },
        qtyOnHand: { gt: 0 },
      },
    });

    const alerts = notifications.map((alert) => ({
      id: alert.id.toString(),
      title: alert.message.split(":")[0] || alert.message,
      detail: alert.message,
      type: alert.type,
      createdAt: alert.createdAt,
    }));

    res.json({
      lowStock,
      expiringSoon,
      expiringBatches,
      openCounts,
      movementsSeries: buckets,
      alerts,
    });
  } catch (err) {
    console.error("[inventory dashboard]", err);
    res.status(500).json({ error: "Failed to load inventory summary" });
  }
});

module.exports = router;
