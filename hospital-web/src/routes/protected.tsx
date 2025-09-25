import { Navigate, Outlet } from "react-router-dom";

import { FullScreenPreloader } from "@/components/layout/Preloader";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenPreloader label="Checking permissions..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
