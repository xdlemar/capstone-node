import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";

import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/features/dashboard/Dashboard";
import LoginPage from "@/features/auth/LoginPage";
import UnauthorizedPage from "@/features/auth/UnauthorizedPage";
import VendorOverviewPage from "@/features/vendor/VendorOverviewPage";
import VendorOrdersPage from "@/features/vendor/VendorOrdersPage";
import VendorOrderDetailPage from "@/features/vendor/VendorOrderDetailPage";
import VendorOrderHistoryPage from "@/features/vendor/VendorOrderHistoryPage";
import VendorShipmentsPage from "@/features/vendor/VendorShipmentsPage";
import ProcurementRequisitionsPage from "@/features/procurement/ProcurementRequisitionsPage";
import ProcurementPurchaseOrdersPage from "@/features/procurement/ProcurementPurchaseOrdersPage";
import ProcurementReceivingPage from "@/features/procurement/ProcurementReceivingPage";
import ProcurementApprovalsPage from "@/features/procurement/ProcurementApprovalsPage";
import ProcurementVendorsPage from "@/features/procurement/ProcurementVendorsPage";
import ProcurementInsightsPage from "@/features/procurement/ProcurementInsightsPage";
import InventoryOverview from "@/features/inventory/InventoryOverview";
import StockControlPage from "@/features/inventory/StockControlPage";
import TransferApprovalsPage from "@/features/inventory/TransferApprovalsPage";
import TransferHistoryPage from "@/features/inventory/TransferHistoryPage";
import StorageAreasPage from "@/features/inventory/StorageAreasPage";
import ItemCatalogPage from "@/features/inventory/ItemCatalogPage";
import DisposalApprovalsPage from "@/features/inventory/DisposalApprovalsPage";
import DisposalLogPage from "@/features/inventory/DisposalLogPage";
import ExpiringItemsPage from "@/features/inventory/ExpiringItemsPage";
import AlmsOverview from "@/features/alms/AlmsOverview";
import AssetsPage from "@/features/alms/AssetsPage";
import WorkOrdersPage from "@/features/alms/WorkOrdersPage";
import SchedulesPage from "@/features/alms/SchedulesPage";
import FinancialPage from "@/features/alms/FinancialPage";
import PltOverview from "@/features/plt/PltOverview";
import DeliveriesPage from "@/features/plt/DeliveriesPage";
import ProjectsPage from "@/features/plt/ProjectsPage";
import LogisticsAlertsPage from "@/features/plt/AlertsPage";
import RoutesPage from "@/features/plt/RoutesPage";
import DocumentsPage from "@/features/dtrs/DocumentsPage";
import DocumentDetailPage from "@/features/dtrs/DocumentDetailPage";
import MissingDocumentsPage from "@/features/dtrs/MissingDocumentsPage";
import AdminOverview from "@/features/admin/AdminOverview";
import ProfilePage from "@/features/profile/ProfilePage";
import ProtectedRoute from "@/routes/protected";
import { RoleGate } from "@/routes/role-gate";
import HomeRedirect from "@/routes/home-redirect";

const STAFF_SET = ["STAFF", "MANAGER", "ADMIN"];
const MANAGER_SET = ["MANAGER", "ADMIN"];
const ADMIN_SET = ["ADMIN"];
const VENDOR_SET = ["VENDOR"];

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
          { index: true, element: <HomeRedirect /> },
          {
            path: "dashboard",
            element: (
              <RoleGate allowed={STAFF_SET}>
                <Dashboard />
              </RoleGate>
            ),
          },
          {
            path: "vendor",
            element: (
              <RoleGate allowed={VENDOR_SET}>
                <Outlet />
              </RoleGate>
            ),
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: "overview", element: <VendorOverviewPage /> },
              { path: "orders", element: <VendorOrdersPage /> },
              { path: "orders/history", element: <VendorOrderHistoryPage /> },
              { path: "orders/:id", element: <VendorOrderDetailPage /> },
              { path: "shipments", element: <VendorShipmentsPage /> },
            ],
          },
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
                path: "insights",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <ProcurementInsightsPage />
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
              { path: "expiring-items", element: <ExpiringItemsPage /> },
              { path: "stock-control", element: <StockControlPage /> },
              {
                path: "disposal-approvals",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <DisposalApprovalsPage />
                  </RoleGate>
                ),
              },
              {
                path: "disposal-log",
                element: (
                  <RoleGate allowed={STAFF_SET}>
                    <DisposalLogPage />
                  </RoleGate>
                ),
              },
              {
                path: "transfer-approvals",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <TransferApprovalsPage />
                  </RoleGate>
                ),
              },
              {
                path: "transfer-history",
                element: (
                  <RoleGate allowed={STAFF_SET}>
                    <TransferHistoryPage />
                  </RoleGate>
                ),
              },
              {
                path: "item-catalog",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <ItemCatalogPage />
                  </RoleGate>
                ),
              },
              {
                path: "storage-areas",
                element: (
                  <RoleGate allowed={ADMIN_SET}>
                    <StorageAreasPage />
                  </RoleGate>
                ),
              },
            ],
          },
          {
            path: "alms",
            element: (
              <RoleGate allowed={STAFF_SET}>
                <Outlet />
              </RoleGate>
            ),
            children: [
              { index: true, element: <Navigate to="assets" replace /> },
              { path: "assets", element: <AssetsPage /> },
              { path: "work-orders", element: <WorkOrdersPage /> },
              {
                path: "schedules",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <SchedulesPage />
                  </RoleGate>
                ),
              },
              {
                path: "financial",
                element: (
                  <RoleGate allowed={ADMIN_SET}>
                    <FinancialPage />
                  </RoleGate>
                ),
              },
              { path: "overview", element: <AlmsOverview /> },
            ],
          },
          {
            path: "plt",
            element: (
              <RoleGate allowed={STAFF_SET}>
                <Outlet />
              </RoleGate>
            ),
            children: [
              { index: true, element: <Navigate to="deliveries" replace /> },
              {
                path: "deliveries",
                element: (
                  <RoleGate allowed={STAFF_SET}>
                    <DeliveriesPage />
                  </RoleGate>
                ),
              },
              {
                path: "projects",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <ProjectsPage />
                  </RoleGate>
                ),
              },
              {
                path: "alerts",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <LogisticsAlertsPage />
                  </RoleGate>
                ),
              },
              {
                path: "routes",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <RoutesPage />
                  </RoleGate>
                ),
              },
              { path: "overview", element: <PltOverview /> },
            ],
          },
          {
            path: "dtrs",
            element: (
              <RoleGate allowed={STAFF_SET}>
                <Outlet />
              </RoleGate>
            ),
            children: [
              { index: true, element: <Navigate to="documents" replace /> },
              { path: "documents", element: <DocumentsPage /> },
              { path: "documents/:id", element: <DocumentDetailPage /> },
              {
                path: "missing",
                element: (
                  <RoleGate allowed={MANAGER_SET}>
                    <MissingDocumentsPage />
                  </RoleGate>
                ),
              },
            ],
          },
          { path: "profile", element: <ProfilePage /> },
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
