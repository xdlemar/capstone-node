const { Router } = require("express");
const prisma = require("../prisma.js");
const { requireRole } = require("../auth");

const staffAccess = requireRole("STAFF", "MANAGER", "ADMIN");

const router = Router();

router.get("/procurement", staffAccess, async (req, res) => {
  try {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];

    const [prs, vendors, pos] = await Promise.all([
      prisma.pR.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, prNo: true, status: true, createdAt: true },
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
        },
      }),
    ]);

    const submittedPrs = prs
      .filter((pr) => pr.status === "SUBMITTED")
      .map((pr) => ({
        id: pr.id.toString(),
        prNo: pr.prNo,
        createdAt: pr.createdAt,
      }));

    const approvedPrs = prs
      .filter((pr) => pr.status === "APPROVED")
      .map((pr) => ({
        id: pr.id.toString(),
        prNo: pr.prNo,
        createdAt: pr.createdAt,
      }));

    const vendorPayload = vendors.map((vendor) => ({
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
    }));

    const openPos = pos.map((po) => ({
      id: po.id.toString(),
      poNo: po.poNo,
      prNo: po.PR?.prNo ?? null,
      vendorName: po.vendor?.name ?? null,
      status: po.status,
      orderedAt: po.orderedAt,
    }));

    res.json({ submittedPrs, approvedPrs, vendors: vendorPayload, openPos });
  } catch (err) {
    console.error("[GET /lookups/procurement]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
