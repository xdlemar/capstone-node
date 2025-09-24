import { Navigate, Outlet } from "react-router-dom";
import { auth } from "@/lib/auth";
export default function ProtectedRoute() {
  return auth.isAuthed() ? <Outlet/> : <Navigate to="/login" replace/>;
}
