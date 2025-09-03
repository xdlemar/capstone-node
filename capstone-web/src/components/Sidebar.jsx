// src/layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { PERMS, can } from "../utils/rbac";
import  useAuth  from "../hooks/useAuth";

const Item = ({ to, children, onClick }) => (
  <NavLink
    to={to}
    className={({isActive}) => "nav-item" + (isActive ? " active":"")}
    onClick={onClick}
  >
    {children}
  </NavLink>
);

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const role = user?.role;

  // close sidebar after clicking in mobile
  const closeIfMobile = () => { if (window.innerWidth < 992) onClose?.(); };

  return (
    <>
      {/* overlay for mobile */}
      <div className={"backdrop" + (open ? " show": "")} onClick={onClose} />

      <aside className={"sidebar" + (open ? " open": "")}>
        <div className="sidebar-title">Hospital Logistics</div>

        {/* INVENTORY */}
        {can(role, PERMS.INVENTORY_VIEW) && (
          <>
            <div className="section">Inventory</div>
            <Item to="/inventory/balances" onClick={closeIfMobile}>Balances</Item>
            <Item to="/inventory/receive" onClick={closeIfMobile}>Receive</Item>
            <Item to="/inventory/issue" onClick={closeIfMobile}>Issue</Item>
            <Item to="/inventory/transfer" onClick={closeIfMobile}>Transfer</Item>
            <Item to="/inventory/adjust" onClick={closeIfMobile}>Adjust</Item>
          </>
        )}

        {/* PROCUREMENT */}
        {can(role, PERMS.PROCUREMENT_VIEW) && (
          <>
            <div className="section">Procurement</div>
            <Item to="/procurement/pos" onClick={closeIfMobile}>POs</Item>
            {can(role, PERMS.GRN_CREATE) && (
              <Item to="/procurement/grn/new" onClick={closeIfMobile}>New GRN</Item>
            )}
          </>
        )}

        {/* ASSETS */}
        {can(role, PERMS.ASSET_VIEW) && (
          <>
            <div className="section">Assets</div>
            <Item to="/assets" onClick={closeIfMobile}>Assets</Item>
          </>
        )}

        {/* DOCUMENTS */}
        {can(role, PERMS.DOC_VIEW) && (
          <>
            <div className="section">Documents</div>
            <Item to="/documents" onClick={closeIfMobile}>Documents</Item>
          </>
        )}

        {/* PROJECTS */}
        {can(role, PERMS.PROJ_VIEW) && (
          <>
            <div className="section">Projects</div>
            <Item to="/projects" onClick={closeIfMobile}>Projects</Item>
          </>
        )}

        {/* REPORTS & ADMIN */}
        {(can(role, PERMS.REPORTS_VIEW) || can(role, PERMS.SYSTEM_ADMIN)) && (
          <>
            <div className="section">Reports & Admin</div>
            {can(role, PERMS.REPORTS_VIEW) &&
              <Item to="/reports" onClick={closeIfMobile}>Reports</Item>}
            {can(role, PERMS.SYSTEM_ADMIN) &&
              <Item to="/system" onClick={closeIfMobile}>System</Item>}
          </>
        )}
      </aside>
    </>
  );
}
