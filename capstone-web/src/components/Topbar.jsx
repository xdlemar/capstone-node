// src/layout/Topbar.jsx
import React from "react";
import  useAuth  from "../hooks/useAuth";

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <button className="icon-btn" aria-label="Menu" onClick={onToggleSidebar}>
        {/* hamburger */}
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="brand">
        <span className="logo-dot" /> <span>Logistics 1</span>
      </div>

      <div className="spacer" />
      <div className="user-chip" title={user?.email || ""}>
        <div className="avatar">{(user?.name || "U").slice(0,1)}</div>
        <div className="meta">
          <div className="name">{user?.name || "Guest"}</div>
          {user?.role && <div className="role">{user.role}</div>}
        </div>
      </div>
      {user && (
        <button className="btn btn-outline" onClick={logout}>Logout</button>
      )}
    </header>
  );
}
