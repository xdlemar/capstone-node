import { Navigate } from "react-router-dom";

import { FullScreenPreloader } from "@/components/layout/Preloader";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRoute } from "@/lib/roles";

export default function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenPreloader label="Loading access..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRoute(user.roles)} replace />;
}
