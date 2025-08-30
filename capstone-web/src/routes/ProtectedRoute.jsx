import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function ProtectedRoute({ roles = [] }){
  const auth = useAuthStore(s=>s.user);
  if(!auth) return <Navigate to="/login" replace />;
  const role = auth.user?.role;
  if(roles.length && !roles.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
