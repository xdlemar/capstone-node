const STAFF_ROLES = ["STAFF", "MANAGER", "ADMIN"];

function hasStaffRole(roles: string[]) {
  return roles.some((role) => STAFF_ROLES.includes(role));
}

export function getDefaultRoute(roles: string[]) {
  if (hasStaffRole(roles)) return "/dashboard";
  if (roles.includes("VENDOR")) return "/vendor/overview";
  return "/dashboard";
}

export { STAFF_ROLES, hasStaffRole };
