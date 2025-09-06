const { Router } = require("express");
const { prisma } = require("../prisma");
const r = Router();

r.post("/", async (req, res) => {
  const { itemId, lotNo, expiryDate, qtyOnHand } = req.body;
  const batch = await prisma.batch.create({
    data: {
      itemId: BigInt(itemId),
      lotNo: lotNo || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      qtyOnHand: qtyOnHand || 0
    },
  });
  res.status(201).json(batch);
});

module.exports = r;
