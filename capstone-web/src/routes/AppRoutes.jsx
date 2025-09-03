// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";

// Inventory
import Balances from "../pages/inventory/Balances";
import ReceiveForm from "../pages/inventory/ReceiveForm";
import IssueForm from "../pages/inventory/IssueForm";
import TransferForm from "../pages/inventory/TransferForm";
import AdjustForm from "../pages/inventory/AdjustForm";

// Procurement
import POList from "../pages/procurement/POList";
import GRNNew from "../pages/procurement/GRNNew";

// Assets, Docs, Projects
import Assets from "../pages/assets/Assets";
import Documents from "../pages/documents/Documents";
import Projects from "../pages/projects/Projects";

import Layout from "../layout/Layout";
import Protected from "./Protected";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <Protected>
            <Layout>
              <Dashboard />
            </Layout>
          </Protected>
        }
      />

      {/* Inventory */}
      <Route
        path="/inventory/balances"
        element={
          <Protected>
            <Layout><Balances /></Layout>
          </Protected>
        }
      />
      <Route
        path="/inventory/receive"
        element={
          <Protected>
            <Layout><ReceiveForm /></Layout>
          </Protected>
        }
      />
      <Route
        path="/inventory/issue"
        element={
          <Protected>
            <Layout><IssueForm /></Layout>
          </Protected>
        }
      />
      <Route
        path="/inventory/transfer"
        element={
          <Protected>
            <Layout><TransferForm /></Layout>
          </Protected>
        }
      />
      <Route
        path="/inventory/adjust"
        element={
          <Protected>
            <Layout><AdjustForm /></Layout>
          </Protected>
        }
      />

      {/* Procurement */}
      <Route
        path="/procurement/pos"
        element={
          <Protected>
            <Layout><POList /></Layout>
          </Protected>
        }
      />
      <Route
        path="/procurement/grn/new"
        element={
          <Protected>
            <Layout><GRNNew /></Layout>
          </Protected>
        }
      />

      {/* Assets / Documents / Projects */}
      <Route
        path="/assets"
        element={
          <Protected>
            <Layout><Assets /></Layout>
          </Protected>
        }
      />
      <Route
        path="/documents"
        element={
          <Protected>
            <Layout><Documents /></Layout>
          </Protected>
        }
      />
      <Route
        path="/projects"
        element={
          <Protected>
            <Layout><Projects /></Layout>
          </Protected>
        }
      />

      {/* catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
