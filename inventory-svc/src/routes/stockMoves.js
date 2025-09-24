const { Router } = require("express");
const { recordStockMove } = require("../services/stockMove");

const r = Router();

/**
 * POST /stock-moves
 */
r.post("/", async (req, res) => {
  try {
    const {
      itemId,
      qty,
      reason,
      refType,
      refId,
      eventId,
      fromLocId,
      toLocId,
      batchId,
      lotNo,
      expiryDate,
    } = req.body || {};

    if (!itemId || !qty || !reason) {
      return res.status(400).json({ error: "itemId, qty, reason are required" });
    }

    const qtyNumber = typeof qty === "number" ? qty : Number(qty);
    if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
      return res.status(400).json({ error: "qty must be a positive number" });
    }

    const move = await recordStockMove({
      itemId,
      qty: qtyNumber,
      reason,
      refType,
      refId,
      eventId,
      fromLocId,
      toLocId,
      lotNo,
      expiryDate,
      batchId,
    });

    res.status(201).json(move);
  } catch (e) {
    if (e?.status === 400) {
      return res.status(400).json({ error: e.message });
    }
    if (e?.status === 404) {
      return res.status(404).json({ error: e.message });
    }
    if (e?.status === 409) {
      return res.status(409).json({ error: e.message });
    }
    console.error("[POST /stock-moves]", e);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = r;
