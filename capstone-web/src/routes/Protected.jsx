import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Protected({ children }) {
  const { token } = useAuth();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}
