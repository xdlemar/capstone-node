import { Navigate } from "react-router-dom";

import { FullScreenPreloader } from "@/components/layout/Preloader";
import { useAuth } from "@/contexts/AuthContext";

type RoleGateProps = {
  allowed: string[];
  children: React.ReactNode;
};

export function RoleGate({ allowed, children }: RoleGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenPreloader label="Loading access..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const ok = allowed.length === 0 || allowed.some((role) => user.roles.includes(role));
  if (!ok) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
