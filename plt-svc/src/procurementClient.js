const jwt = require("jsonwebtoken");

const BASE = process.env.PROCUREMENT_URL || "http://localhost:4002";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret_dev_only";
const SERVICE_SUB = process.env.SERVICE_TOKEN_SUB || "plt-svc";
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

async function fetchJson(path) {
  const resp = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${getServiceToken()}`,
    },
  });

  const text = await resp.text().catch(() => "");
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (resp.status === 404) {
    return null;
  }

  if (!resp.ok) {
    throw new Error(`[procurementClient] ${resp.status} ${text}`);
  }

  return payload;
}

async function getPoApprovalById(poId) {
  return fetchJson(`/internal/po/${poId}/approval`);
}

async function getPoApprovalByNo(poNo) {
  return fetchJson(`/internal/po/by-no/${encodeURIComponent(poNo)}/approval`);
}

module.exports = { getPoApprovalById, getPoApprovalByNo };
