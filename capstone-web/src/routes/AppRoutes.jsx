import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";

import ItemsList from "../pages/inventory/ItemsList";
import ReceiveForm from "../pages/inventory/ReceiveForm";
import IssueForm from "../pages/inventory/IssueForm";
import TransferForm from "../pages/inventory/TransferForm";
import AdjustForm from "../pages/inventory/AdjustForm";

import GRNNew from "../pages/procurement/GRNNew";
import POList from "../pages/procurement/POList";

import Assets from "../pages/assets/Assets";
import Documents from "../pages/documents/Documents";
import Projects from "../pages/projects/Projects";

export default function AppRoutes(){
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        {/* Inventory */}
        <Route path="/inventory" element={<ItemsList />} />
        <Route path="/inventory/receive" element={<ReceiveForm />} />
        <Route path="/inventory/issue" element={<IssueForm />} />
        <Route path="/inventory/transfer" element={<TransferForm />} />
        <Route path="/inventory/adjust" element={<AdjustForm />} />
        {/* Procurement */}
        <Route path="/procurement/pos" element={<POList />} />
        <Route path="/procurement/grn/new" element={<GRNNew />} />
        {/* Ops */}
        <Route path="/assets" element={<Assets />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/projects" element={<Projects />} />
        {/* stubs */}
        <Route path="/reports" element={<div style={{padding:16}}>Reports (stub)</div>} />
        <Route path="/admin" element={<div style={{padding:16}}>System Admin (stub)</div>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
