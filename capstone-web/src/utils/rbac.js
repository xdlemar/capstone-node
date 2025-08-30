
export const PERMS = {
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_TX:   "inventory.tx",

  PROCUREMENT_VIEW: "proc.view",
  GRN_CREATE:       "grn.create",

  ASSET_VIEW:  "alms.view",
  ASSET_EDIT:  "alms.edit",

  DOC_VIEW:    "dtrs.view",
  DOC_EDIT:    "dtrs.edit",

  PROJ_VIEW:   "plt.view",
  PROJ_EDIT:   "plt.write",

  REPORTS_VIEW: "reports.view",
  SYSTEM_ADMIN: "system.admin"
};

const matrix = {
  ADMIN: ["*"],
  STAFF: [
    PERMS.INVENTORY_VIEW, PERMS.INVENTORY_TX,
    PERMS.PROCUREMENT_VIEW, PERMS.GRN_CREATE,
    PERMS.ASSET_VIEW,
    PERMS.DOC_VIEW, PERMS.DOC_EDIT,
    PERMS.PROJ_VIEW, PERMS.PROJ_EDIT,
    PERMS.REPORTS_VIEW
  ],
  IT: [
    PERMS.INVENTORY_VIEW,
    PERMS.PROCUREMENT_VIEW,
    PERMS.ASSET_VIEW,
    PERMS.DOC_VIEW,
    PERMS.PROJ_VIEW,
    PERMS.REPORTS_VIEW,
    PERMS.SYSTEM_ADMIN
  ]
};

export function can(role, perm) {
  if (!role) return false;
  const allowed = matrix[role] || [];
  return allowed.includes("*") || allowed.includes(perm);
}

export function canAny(role, perms = []) {
  return perms.some(p => can(role, p));
}
