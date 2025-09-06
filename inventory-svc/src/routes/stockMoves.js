const { Router } = require("express");
const { applyStockMove } = require("../services/stock");
const r = Router();

r.post("/", async (req, res) => {
  try {
    const m = await applyStockMove({
      itemId: req.body.itemId,
      batchId: req.body.batchId,
      fromLocId: req.body.fromLocId,
      toLocId: req.body.toLocId,
      qty: Number(req.body.qty),
      reason: String(req.body.reason),
      refType: req.body.refType,
      refId: req.body.refId,
      eventId: req.body.eventId,
    });
    res.status(201).json(m);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = r;
