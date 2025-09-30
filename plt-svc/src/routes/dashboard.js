const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

router.get('/dashboard/summary', async (_req, res) => {
  try {
    const [activeProjects, deliveriesInTransit, delayedDeliveries, alertsOpen, latestAlerts] = await Promise.all([
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.delivery.count({ where: { status: { in: ['DISPATCHED', 'IN_TRANSIT'] } } }),
      prisma.delivery.count({ where: { status: 'DELAYED' } }),
      prisma.deliveryAlert.count({ where: { resolvedAt: null } }),
      prisma.deliveryAlert.findMany({
        where: { resolvedAt: null },
        orderBy: { triggeredAt: 'desc' },
        take: 5,
        select: {
          id: true,
          message: true,
          type: true,
          triggeredAt: true,
          delivery: {
            select: {
              id: true,
              trackingNo: true,
              status: true,
            },
          },
        },
      }),
    ]);

    res.json({
      activeProjects,
      deliveriesInTransit,
      delayedDeliveries,
      alertsOpen,
      alerts: latestAlerts.map((alert) => ({
        id: alert.id.toString(),
        message: alert.message,
        type: alert.type,
        triggeredAt: alert.triggeredAt,
        delivery: alert.delivery
          ? {
              id: alert.delivery.id.toString(),
              trackingNo: alert.delivery.trackingNo,
              status: alert.delivery.status,
            }
          : null,
      })),
    });
  } catch (err) {
    console.error('[plt dashboard]', err);
    res.status(500).json({ error: 'Failed to load project logistics summary' });
  }
});

module.exports = router;
