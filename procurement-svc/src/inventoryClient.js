// Uses Node 18+ global fetch to call inventory-svc for stock moves.
const BASE = process.env.INVENTORY_URL || "http://localhost:4001";

async function postStockMove(body) {
  const resp = await fetch(`${BASE}/stock-moves`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`[inventoryClient] POST /stock-moves ${resp.status} ${text}`);
  }
  return resp.json();
}

module.exports = { postStockMove };
