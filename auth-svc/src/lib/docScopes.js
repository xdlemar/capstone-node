const DOC_MODULES = [
  "PROCUREMENT",
  "DELIVERY",
  "PROJECT",
  "ASSET",
  "MAINTENANCE",
  "INVENTORY",
  "OTHER",
];

function fallbackDocScopes(roles = []) {
  const upperRoles = roles.map((role) => String(role).toUpperCase());
  if (upperRoles.includes("ADMIN") || upperRoles.includes("MANAGER")) {
    return DOC_MODULES.reduce((acc, module) => {
      acc[module] = ["*"];
      return acc;
    }, {});
  }
  return {};
}

function normalizeScopeValues(value) {
  if (value === null || value === undefined) return [];
  if (value === "*" || value === true) return ["*"];
  const list = Array.isArray(value)
    ? value
    : Array.isArray(value?.ids)
    ? value.ids
    : Array.isArray(value?.values)
    ? value.values
    : Array.isArray(value?.allowed)
    ? value.allowed
    : [];
  return list
    .map((entry) => {
      if (entry === null || entry === undefined) return null;
      if (typeof entry === "bigint") return entry.toString();
      if (entry === "*") return "*";
      return String(entry);
    })
    .filter((entry) => entry !== null);
}

function sanitizeDocScopesInput(rawScopes) {
  if (!rawScopes || typeof rawScopes !== "object") return {};
  const sanitized = {};
  for (const [module, value] of Object.entries(rawScopes)) {
    const key = typeof module === "string" ? module.toUpperCase() : null;
    if (!key) continue;
    const scopes = normalizeScopeValues(value);
    sanitized[key] = scopes;
  }
  return sanitized;
}

function normalizeDocScopes(rawScopes, roles = []) {
  const sanitized = sanitizeDocScopesInput(rawScopes);
  if (Object.keys(sanitized).length === 0) {
    return fallbackDocScopes(roles);
  }
  return sanitized;
}

function buildDocScopes(user, roles = []) {
  try {
    return normalizeDocScopes(user?.docScopes, roles);
  } catch (err) {
    console.warn("[auth] failed to normalize doc scopes", err);
    return fallbackDocScopes(roles);
  }
}

module.exports = {
  DOC_MODULES,
  fallbackDocScopes,
  normalizeDocScopes,
  sanitizeDocScopesInput,
  buildDocScopes,
};
