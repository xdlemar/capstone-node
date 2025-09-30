const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { requireRole } = require("../auth");

const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

router.get("/dashboard/summary", staffAccess, async (_req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [openRequests, pendingApprovals, openPurchaseOrders, receiptsThisWeek] = await Promise.all([
      prisma.pR.count({
        where: { status: { in: ["DRAFT", "SUBMITTED"] } },
      }),
      prisma.pR.count({ where: { status: "SUBMITTED" } }),
      prisma.pO.count({ where: { status: { in: ["OPEN", "PARTIAL"] } } }),
      prisma.receipt.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    res.json({
      openRequests,
      pendingApprovals,
      openPurchaseOrders,
      receiptsThisWeek,
    });
  } catch (err) {
    console.error("[procurement dashboard]", err);
    res.status(500).json({ error: "Failed to load procurement summary" });
  }
});

module.exports = router;
