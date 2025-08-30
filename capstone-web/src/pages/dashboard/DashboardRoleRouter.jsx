import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function DashboardRoleRouter(){
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map = { ADMIN: '/dashboard/admin', STAFF: '/dashboard/staff', IT: '/dashboard/it' };
  return <Navigate to={map[user.role] || '/'} replace />;
}
