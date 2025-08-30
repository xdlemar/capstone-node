import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import ItemsList from "../pages/inventory/ItemsList";
import ReceiveForm from "../pages/inventory/ReceiveForm";
import IssueForm from "../pages/inventory/IssueForm";
import TransferForm from "../pages/inventory/TransferForm";
import AdjustForm from "../pages/inventory/AdjustForm";
import SuppliersList from "../pages/procurement/SuppliersList";
import POList from "../pages/procurement/POList";
import GRNNew from "../pages/procurement/GRNNew";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes(){
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />

        {/* Inventory */}
        <Route path="/inventory" element={
          <ProtectedRoute requiredPerm="inventory.view" element={<ItemsList />} />
        }/>
        <Route path="/inventory/receive" element={
          <ProtectedRoute requiredPerm="inventory.receive" element={<ReceiveForm />} />
        }/>
        <Route path="/inventory/issue" element={
          <ProtectedRoute requiredPerm="inventory.issue" element={<IssueForm />} />
        }/>
        <Route path="/inventory/transfer" element={
          <ProtectedRoute requiredPerm="inventory.transfer" element={<TransferForm />} />
        }/>
        <Route path="/inventory/adjust" element={
          <ProtectedRoute requiredPerm="inventory.adjust" element={<AdjustForm />} />
        }/>

        {/* Procurement */}
        <Route path="/procurement/suppliers" element={
          <ProtectedRoute requiredPerm="procurement.view" element={<SuppliersList />} />
        }/>
        <Route path="/procurement/pos" element={
          <ProtectedRoute requiredPerm="procurement.view" element={<POList />} />
        }/>
        <Route path="/procurement/grn/new" element={
          <ProtectedRoute requiredPerm="grn.create" element={<GRNNew />} />
        }/>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
