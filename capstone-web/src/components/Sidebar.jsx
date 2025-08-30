import { NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { can, PERMS } from "../utils/rbac";

const groups = (role) => [
  {
    title: "Inventory",
    items: [
      { label: "Balances", to: "/inventory", show: can(role, PERMS.INVENTORY_VIEW) },
      { label: "Receive",  to: "/inventory/receive", show: can(role, PERMS.INVENTORY_TX) },
      { label: "Issue",    to: "/inventory/issue", show: can(role, PERMS.INVENTORY_TX) },
      { label: "Transfer", to: "/inventory/transfer", show: can(role, PERMS.INVENTORY_TX) },
      { label: "Adjust",   to: "/inventory/adjust", show: can(role, PERMS.INVENTORY_TX) }
    ]
  },
  {
    title: "Procurement",
    items: [
      { label: "POs",    to: "/procurement/pos", show: can(role, PERMS.PROCUREMENT_VIEW) },
      { label: "New GRN",to: "/procurement/grn/new", show: can(role, PERMS.GRN_CREATE) }
    ]
  },
  {
    title: "Assets",
    items: [
      { label: "Assets", to: "/assets", show: can(role, PERMS.ASSET_VIEW) }
    ]
  },
  {
    title: "Documents",
    items: [
      { label: "Documents", to: "/documents", show: can(role, PERMS.DOC_VIEW) }
    ]
  },
  {
    title: "Projects",
    items: [
      { label: "Projects", to: "/projects", show: can(role, PERMS.PROJ_VIEW) }
    ]
  },
  {
    title: "Reports & Admin",
    items: [
      { label: "Reports", to: "/reports", show: can(role, PERMS.REPORTS_VIEW) },
      { label: "System",  to: "/admin", show: can(role, PERMS.SYSTEM_ADMIN) }
    ]
  }
];

export default function Sidebar(){
  const { user } = useAuth();
  const role = user?.role || "";
  const gs = groups(role);

  return (
    <aside className="sidebar">
      <div className="brand">Hospital Logistics</div>
      {gs.map(g => {
        const visible = g.items.filter(i => i.show);
        if (!visible.length) return null;
        return (
          <div key={g.title} className="group">
            <div className="group-title">{g.title}</div>
            {visible.map(i=>(
              <NavLink key={i.to} to={i.to} className={({isActive}) => isActive ? "a active" : "a"}>
                {i.label}
              </NavLink>
            ))}
          </div>
        );
      })}
    </aside>
  );
}
