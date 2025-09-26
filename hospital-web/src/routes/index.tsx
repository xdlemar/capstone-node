import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";

import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/features/dashboard/Dashboard";
import LoginPage from "@/features/auth/LoginPage";
import UnauthorizedPage from "@/features/auth/UnauthorizedPage";
import ProcurementRequisitionsPage from "@/features/procurement/ProcurementRequisitionsPage";
import ProcurementPurchaseOrdersPage from "@/features/procurement/ProcurementPurchaseOrdersPage";
import ProcurementReceivingPage from "@/features/procurement/ProcurementReceivingPage";
import ProcurementApprovalsPage from "@/features/procurement/ProcurementApprovalsPage";
import ProcurementVendorsPage from "@/features/procurement/ProcurementVendorsPage";
import InventoryOverview from "@/features/inventory/InventoryOverview";
import StockControlPage from "@/features/inventory/StockControlPage";
import CycleCountPage from "@/features/inventory/CycleCountPage";
import AlmsOverview from "@/features/alms/AlmsOverview";
import PltOverview from "@/features/plt/PltOverview";
import DtrsOverview from "@/features/dtrs/DtrsOverview";
import AdminOverview from "@/features/admin/AdminOverview";
import ProtectedRoute from "@/routes/protected";
import { RoleGate } from "@/routes/role-gate";

const STAFF_SET = ["STAFF", "MANAGER", "ADMIN"];
const MANAGER_SET = ["MANAGER", "ADMIN"];
const ADMIN_SET = ["ADMIN"];

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "dashboard", element: <Dashboard /> },
          {
            path: "procurement",
            element: (
              <RoleGate allowed={STAFF_SET}>
                <Outlet />
              </RoleGate>
            ),
            children: [
              { index: true, element: <Navigate to="requisitions" replace /> },
              { path: "requisitions", element: <ProcurementRequisitionsPage /> },
              { path: "purchase-orders", element: <ProcurementPurchaseOrdersPage /> },
              { path: "receiving", element: <ProcurementReceivingPage /> },
              {
                path: "approvals",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <ProcurementApprovalsPage />
                  </RoleGate>
                ),
              },
              {
                path: "vendors",
                element: (
                  <RoleGate allowed={ADMIN_SET}>
                    <ProcurementVendorsPage />
                  </RoleGate>
                ),
              },
            ],
          },
          {
            path: "inventory",
            element: (
              <RoleGate allowed={STAFF_SET}>
                <Outlet />
              </RoleGate>
            ),
            children: [
              { index: true, element: <Navigate to="stock-levels" replace /> },
              { path: "stock-levels", element: <InventoryOverview /> },
              { path: "stock-control", element: <StockControlPage /> },
              {
                path: "cycle-counts",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <CycleCountPage />
                  </RoleGate>
                ),
              },
            ],
          },
          {
            path: "alms",
            element: (
              <RoleGate allowed={STAFF_SET}>
                <AlmsOverview />
              </RoleGate>
            ),
          },
          {
            path: "plt",
            element: (
              <RoleGate allowed={MANAGER_SET}>
                <PltOverview />
              </RoleGate>
            ),
          },
          {
            path: "dtrs",
            element: (
              <RoleGate allowed={MANAGER_SET}>
                <DtrsOverview />
              </RoleGate>
            ),
          },
          {
            path: "admin",
            element: (
              <RoleGate allowed={ADMIN_SET}>
                <AdminOverview />
              </RoleGate>
            ),
          },
        ],
      },
    ],
  },
]);






