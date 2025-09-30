const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { requireRole } = require("../auth");

const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

router.get("/dashboard/summary", staffAccess, async (_req, res) => {
  try {
    const now = new Date();
    const upcomingThreshold = new Date(now);
    upcomingThreshold.setDate(now.getDate() + 14);

    const [activeAssets, openWorkOrders, maintenanceDueSoon, alertsOpen, recentAlerts] = await Promise.all([
      prisma.asset.count({ where: { status: { notIn: ["RETIRED", "DISPOSED"] } } }),
      prisma.maintenanceWorkOrder.count({
        where: { status: { in: ["OPEN", "SCHEDULED", "IN_PROGRESS"] } },
      }),
      prisma.maintenanceSchedule.count({
        where: {
          nextDue: {
            not: null,
            gte: now,
            lte: upcomingThreshold,
          },
        },
      }),
      prisma.maintenanceAlert.count({ where: { resolvedAt: null } }),
      prisma.maintenanceAlert.findMany({
        where: { resolvedAt: null },
        orderBy: { triggeredAt: "desc" },
        take: 5,
        select: {
          id: true,
          message: true,
          triggeredAt: true,
          type: true,
        },
      }),
    ]);

    res.json({
      activeAssets,
      openWorkOrders,
      maintenanceDueSoon,
      alertsOpen,
      alerts: recentAlerts.map((alert) => ({
        id: alert.id.toString(),
        message: alert.message,
        triggeredAt: alert.triggeredAt,
        type: alert.type,
      })),
    });
  } catch (err) {
    console.error("[alms dashboard]", err);
    res.status(500).json({ error: "Failed to load asset summary" });
  }
});

module.exports = router;
