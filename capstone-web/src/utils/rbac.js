// Permission matrix mirrors backend roles
const MATRIX = {
  ADMIN: ["*"],
  STAFF: [
    "inventory.view","inventory.receive","inventory.issue","inventory.transfer","inventory.adjust",
    "alerts.view","procurement.view","grn.create","reports.view"
  ],
  IT: ["inventory.view","procurement.view","alerts.view","reports.view","system.maintain"],
};

export function can(role, perm) {
  if (!role) return false;
  const list = MATRIX[role] || [];
  return list.includes("*") || list.includes(perm);
}
export function canAny(role, perms = []) {
  return perms.some(p => can(role, p));
}
export function allPerms(role){ return MATRIX[role] || []; }
