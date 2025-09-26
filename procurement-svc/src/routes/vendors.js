const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const { requireRole } = require("../auth");
const { computeVendorMetrics } = require("../services/vendorMetrics");

const adminOnly = requireRole("ADMIN");
const managerAccess = requireRole("MANAGER", "ADMIN");

function toBigInt(value, field) {
  if (value === undefined || value === null || value === "") {
    throw Object.assign(new Error(`${field} is required`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  try {
    return BigInt(value);
  } catch {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
}

function clampNumber(value, { min, max, fallback }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

// Create/upsert vendor by name
router.post("/vendors", adminOnly, async (req, res) => {
  const { name, email, phone, address } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });

  const vendor = await prisma.vendor.upsert({
    where: { name },
    update: { email, phone, address },
    create: { name, email, phone, address },
  });

  res.json(vendor);
});

router.get("/vendors", managerAccess, async (req, res) => {
  const vendors = await prisma.vendor.findMany({
    include: {
      metrics: true,
    },
    orderBy: { name: "asc" },
  });

  res.json(
    vendors.map((v) => ({
      id: v.id.toString(),
      name: v.name,
      email: v.email,
      phone: v.phone,
      address: v.address,
      metrics: v.metrics
        ? {
            onTimePercentage: v.metrics.onTimePercentage,
            avgLeadTimeDays: v.metrics.avgLeadTimeDays,
            fulfillmentRate: v.metrics.fulfillmentRate,
            totalSpend: Number(v.metrics.totalSpend),
            lastEvaluatedAt: v.metrics.lastEvaluatedAt,
          }
        : null,
    }))
  );
});

router.get("/vendors/:id/performance", managerAccess, async (req, res) => {
  try {
    const vendorId = toBigInt(req.params.id, "id");

    const lookbackDays = clampNumber(req.query.lookbackDays, {
      min: 30,
      max: 365,
      fallback: 90,
    });
    const targetLeadDays = clampNumber(req.query.targetLeadDays, {
      min: 1,
      max: 30,
      fallback: 7,
    });

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const metrics = await computeVendorMetrics(vendorId, { lookbackDays, targetLeadDays });

    res.json({
      vendorId: vendorId.toString(),
      name: vendor.name,
      lookbackDays: metrics.lookbackDays,
      targetLeadDays,
      onTimePercentage: metrics.onTimePercentage,
      avgLeadTimeDays: metrics.avgLeadTimeDays,
      fulfillmentRate: metrics.fulfillmentRate,
      totalSpend: metrics.totalSpend,
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    console.error("[/vendors/:id/performance]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
