const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

function toNumber(value) {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

router.get("/dashboard/summary", async (_req, res) => {
  try {
    const [
      activeProjects,
      deliveriesInTransit,
      delayedDeliveries,
      alertsOpen,
      latestAlerts,
      deliveryCostGroups,
      deliveryCostSum,
    ] = await Promise.all([
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.delivery.count({ where: { status: { in: ["DISPATCHED", "IN_TRANSIT"] } } }),
      prisma.delivery.count({ where: { status: "DELAYED" } }),
      prisma.deliveryAlert.count({ where: { resolvedAt: null } }),
      prisma.deliveryAlert.findMany({
        where: { resolvedAt: null },
        orderBy: { triggeredAt: "desc" },
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
      prisma.projectCost.groupBy({
        by: ["projectId"],
        where: { sourceType: "DELIVERY" },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
      prisma.projectCost.aggregate({
        where: { sourceType: "DELIVERY" },
        _sum: { amount: true },
      }),
    ]);

    let deliveryCostDetails = [];
    if (deliveryCostGroups.length > 0) {
      const projectIds = deliveryCostGroups.map((row) => row.projectId);
      const projectRecords = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          budget: true,
        },
      });
      const projectMap = new Map(projectRecords.map((project) => [project.id.toString(), project]));
      deliveryCostDetails = deliveryCostGroups.map((group) => {
        const project = projectMap.get(group.projectId.toString());
        const deliveryCost = toNumber(group._sum.amount);
        return {
          projectId: group.projectId.toString(),
          code: project?.code ?? `PROJECT-${group.projectId.toString()}`,
          name: project?.name ?? "Unknown project",
          status: project?.status ?? "UNKNOWN",
          budget: project?.budget != null ? toNumber(project.budget) : null,
          deliveryCost,
        };
      });
    }

    const totalDeliverySpend = toNumber(deliveryCostSum?._sum?.amount);

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
      deliveryCosts: {
        totalDeliverySpend,
        perProject: deliveryCostDetails,
      },
    });
  } catch (err) {
    console.error("[plt dashboard]", err);
    res.status(500).json({ error: "Failed to load project logistics summary" });
  }
});

module.exports = router;
