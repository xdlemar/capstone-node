import { NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { can } from "../utils/rbac";

const LinkItem = ({ to, label }) => (
  <li><NavLink to={to} className={({isActive}) => isActive ? "active" : ""}>{label}</NavLink></li>
);

export default function Sidebar(){
  const { user } = useAuth();
  const role = user?.role;

  return (
    <aside className="sidebar">
      <nav>
        <p className="section">Inventory</p>
        <ul>
          {can(role,"inventory.view") && <LinkItem to="/inventory" label="Balances" />}
          {can(role,"inventory.receive") && <LinkItem to="/inventory/receive" label="Receive" />}
          {can(role,"inventory.issue") && <LinkItem to="/inventory/issue" label="Issue (stub)" />}
          {can(role,"inventory.transfer") && <LinkItem to="/inventory/transfer" label="Transfer (stub)" />}
          {can(role,"inventory.adjust") && <LinkItem to="/inventory/adjust" label="Adjust (stub)" />}
        </ul>

        <p className="section">Procurement</p>
        <ul>
          {can(role,"procurement.view") && <LinkItem to="/procurement/suppliers" label="Suppliers (stub)" />}
          {can(role,"procurement.view") && <LinkItem to="/procurement/pos" label="POs (stub)" />}
          {can(role,"grn.create") && <LinkItem to="/procurement/grn/new" label="New GRN" />}
        </ul>

        <p className="section">Reports</p>
        <ul>
          {can(role,"reports.view") && <LinkItem to="/" label="Dashboard" />}
        </ul>

        <p className="section">System</p>
        <ul>
          {can(role,"system.maintain") && <li><span>Maintenance (IT)</span></li>}
          {can(role,"users.manage") && <li><span>User Management (Admin)</span></li>}
        </ul>
      </nav>
    </aside>
  );
}
