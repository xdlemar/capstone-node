const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

/**
 * POST /inspection
 * Body: { eventId, sealsIntact?, tempOk?, receivedBy?, notes? }
 */
r.post("/", async (req, res) => {
  try {
    const { eventId, sealsIntact, tempOk, receivedBy, notes } = req.body;
    if (!eventId) return res.status(400).json({ error: "eventId required" });

    const created = await prisma.receivingInspection.upsert({
      where: { eventId },
      update: { sealsIntact, tempOk, receivedBy, notes },
      create: { eventId, sealsIntact, tempOk, receivedBy, notes },
    });

    res.status(201).json(created);
  } catch (e) {
    console.error("[POST /inspection]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
