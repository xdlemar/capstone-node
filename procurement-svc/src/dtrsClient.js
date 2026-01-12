const jwt = require("jsonwebtoken");

const BASE = process.env.DTRS_URL || "http://localhost:4006";
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

async function createDocument(payload) {
  const resp = await fetch(`${BASE}/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getServiceToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text().catch(() => "");
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!resp.ok) {
    throw new Error(`[dtrsClient] ${resp.status} ${text}`);
  }

  return data;
}

module.exports = { createDocument };
