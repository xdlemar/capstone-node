import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute(){
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
