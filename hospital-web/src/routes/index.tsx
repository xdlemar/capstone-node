import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./protected";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/features/auth/LoginPage";
// placeholder until you import v0 dashboard:
const Dashboard = () => <div>Dashboard</div>;

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Dashboard /> },
          { path: "/dashboard", element: <Dashboard /> },
          // add Inventory/Procurement/ALMS/DTRS/PLT routes next
        ],
      },
    ],
  },
]);
