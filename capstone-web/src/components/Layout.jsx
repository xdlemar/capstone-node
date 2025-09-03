// src/layout/Layout.jsx
import React, { useState } from "react";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app">
      <Topbar onToggleSidebar={() => setOpen(o => !o)} />
      <div className="body">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
