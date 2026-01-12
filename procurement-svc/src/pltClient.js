const jwt = require("jsonwebtoken");

const BASE = process.env.PLT_URL || "http://localhost:4005";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret_dev_only";
const SERVICE_SUB = process.env.SERVICE_TOKEN_SUB || "procurement-svc";
const SERVICE_ROLES = (process.env.SERVICE_TOKEN_ROLES || "ADMIN")
  .split(",")
  .map((role) => role.trim())
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

async function fetchPoDeliveryStatuses(poIds) {
  if (!poIds?.length) return [];
  const resp = await fetch(`${BASE}/internal/po-deliveries?poIds=${poIds.join(",")}`, {
    headers: {
      Authorization: `Bearer ${getServiceToken()}`,
    },
  });

  const text = await resp.text().catch(() => "");
  let payload = [];
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = [];
    }
  }

  if (!resp.ok) {
    throw new Error(`[pltClient] ${resp.status} ${text}`);
  }

  return Array.isArray(payload) ? payload : [];
}

module.exports = { fetchPoDeliveryStatuses };
