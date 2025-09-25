const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const { requireRole } = require("../auth");

const adminOnly = requireRole("ADMIN");

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

module.exports = router;
