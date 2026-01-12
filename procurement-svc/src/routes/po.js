const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const { requireRole } = require("../auth");

const managerAccess = requireRole("MANAGER", "ADMIN");

function toBigInt(val, field) {
  if (val === undefined || val === null || val === "") {
    throw Object.assign(new Error(`${field} is required`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  try {
    return BigInt(val);
  } catch {
    throw Object.assign(new Error(`Invalid ${field}`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
}

// Create PO from PR
router.post("/po", managerAccess, async (req, res) => {
  try {
    const { poNo, prNo, vendorId } = req.body || {};
    if (!poNo || !prNo) return res.status(400).json({ error: "poNo, prNo required" });
    const vendorKey = toBigInt(vendorId, "vendorId");

    const pr = await prisma.pR.findUnique({
      where: { prNo },
      include: { lines: true },
    });
    if (!pr) return res.status(404).json({ error: "PR not found" });

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorKey } });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const po = await prisma.$transaction(async (tx) => {
      const created = await tx.pO.upsert({
        where: { poNo },
        update: { vendorId: vendorKey },
        create: {
          poNo,
          status: "OPEN",
          prId: pr.id,
          vendorId: vendorKey,
          lines: {
            create: pr.lines.map((l) => ({
              itemId: l.itemId,
              qty: l.qty,
              unit: l.unit || "",
              price: 0,
            })),
          },
        },
        include: { lines: true, vendor: true },
      });

      await tx.pR.update({
        where: { id: pr.id },
        data: { status: "CLOSED" },
      });

      return created;
    });

    res.json(po);
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    console.error("[/po] error", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
