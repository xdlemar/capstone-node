import { createBrowserRouter } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import Dashboard from "@/features/dashboard/Dashboard"
import LoginPage from "@/features/auth/LoginPage"

export const router = createBrowserRouter([
  // Public
  { path: "/login", element: <LoginPage /> },

  // App (protected)
  {
    path: "/",
    element: <AppLayout />, // your shell with sidebar/header
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/dashboard", element: <Dashboard /> },
      // ...other routes
    ],
  },
])

