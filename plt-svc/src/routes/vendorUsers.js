const router = require("express").Router();
const { prisma } = require("../prisma");

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

function normalizeUserId(value) {
  if (value === undefined || value === null || value === "") {
    throw Object.assign(new Error("userId is required"), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    throw Object.assign(new Error("userId is required"), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  return trimmed;
}

router.post("/", async (req, res) => {
  try {
    const vendorId = toBigInt(req.body?.vendorId, "vendorId");
    const userId = normalizeUserId(req.body?.userId);

    const link = await prisma.vendorUser.upsert({
      where: { vendorId_userId: { vendorId, userId } },
      update: {},
      create: { vendorId, userId },
    });

    res.json({
      id: link.id.toString(),
      vendorId: link.vendorId.toString(),
      userId: link.userId,
      createdAt: link.createdAt,
    });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const vendorId = req.query.vendorId ? toBigInt(req.query.vendorId, "vendorId") : null;
    const userId = req.query.userId ? normalizeUserId(req.query.userId) : null;

    const links = await prisma.vendorUser.findMany({
      where: {
        ...(vendorId ? { vendorId } : {}),
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      links.map((link) => ({
        id: link.id.toString(),
        vendorId: link.vendorId.toString(),
        userId: link.userId,
        createdAt: link.createdAt,
      }))
    );
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Internal error" });
  }
});

router.delete("/:vendorId/:userId", async (req, res) => {
  try {
    const vendorId = toBigInt(req.params.vendorId, "vendorId");
    const userId = normalizeUserId(req.params.userId);
    await prisma.vendorUser.delete({
      where: { vendorId_userId: { vendorId, userId } },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Link not found" });
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
