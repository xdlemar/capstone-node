import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";

import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/features/dashboard/Dashboard";
import LoginPage from "@/features/auth/LoginPage";
import UnauthorizedPage from "@/features/auth/UnauthorizedPage";
import ProcurementOverview from "@/features/procurement/ProcurementOverview";
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
                <ProcurementOverview />
              </RoleGate>
            ),
          },
          {
            path: "inventory",
            element: (
              <RoleGate allowed={STAFF_SET}>
                <Outlet />
              </RoleGate>
            ),
            children: [
              { index: true, element: <Navigate to="stock-control" replace /> },
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
