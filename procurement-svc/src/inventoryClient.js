const axios = require("axios");
const INVENTORY_URL = process.env.INVENTORY_URL || "http://localhost:4001";

/**
 * Post a stock move to inventory (direct call, bypass gateway).
 * Expects: { itemId, toLocId?, fromLocId?, qty, reason, refType, refId, eventId, batchId? }
 */
async function postStockMove(move) {
  const url = `${INVENTORY_URL}/stock-moves`;
  const res = await axios.post(url, move, {
    headers: { "content-type": "application/json" },
    timeout: 15000
  });
  return res.data;
}

module.exports = { postStockMove };
