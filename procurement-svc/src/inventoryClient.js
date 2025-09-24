const jwt = require("jsonwebtoken");

const BASE = process.env.INVENTORY_URL || "http://localhost:4001";
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_dev";
const SERVICE_SUB = process.env.SERVICE_TOKEN_SUB || "procurement-svc";
const SERVICE_ROLES = (process.env.SERVICE_TOKEN_ROLES || "inventory,procurement")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

let cachedToken = null;
let cachedExpiry = 0;

function getServiceToken() {
  const now = Date.now();
  if (cachedToken && cachedExpiry - 30_000 > now) {
    return cachedToken;
  }

  const token = jwt.sign({ sub: SERVICE_SUB, roles: SERVICE_ROLES }, JWT_SECRET, {
    expiresIn: "10m",
  });
  const decoded = jwt.decode(token);
  cachedToken = token;
  cachedExpiry = decoded?.exp ? decoded.exp * 1000 : now + 10 * 60 * 1000;
  return cachedToken;
}

async function postStockMove(body) {
  const resp = await fetch(`${BASE}/stock-moves`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${getServiceToken()}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`[inventoryClient] POST /stock-moves ${resp.status} ${text}`);
  }
  return resp.json();
}

module.exports = { postStockMove };
