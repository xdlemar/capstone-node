const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret_dev_only";

function normalizeRoles(claims) {
  const raw = Array.isArray(claims.roles)
    ? claims.roles
    : [claims.role].filter(Boolean);
  return raw.map((role) => String(role).toUpperCase());
}

function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const claims = jwt.verify(token, JWT_SECRET);
    const roles = normalizeRoles(claims);
    req.user = {
      ...claims,
      roles,
    };
    if (typeof req.user.role === "string") {
      req.user.role = req.user.role.toUpperCase();
    }
    if (req.user.sub !== undefined && req.user.sub !== null) {
      req.user.sub = String(req.user.sub);
    }
    next();
  } catch (err) {
    console.warn("[dtrs auth] invalid token", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireRole(...roles) {
  const allowed = roles.map((role) => String(role).toUpperCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userRoles = Array.isArray(req.user.roles)
      ? req.user.roles.map((role) => String(role).toUpperCase())
      : [req.user.role].filter(Boolean).map((role) => String(role).toUpperCase());
    const permitted = allowed.some((role) => userRoles.includes(role));
    if (!permitted) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

module.exports = { authRequired, requireRole };
