import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function Topbar(){
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const doLogout = () => {
    logout();
    nav('/login');
  };

  return (
    <div className="topbar">
      <div className="brand">
        <img src="/logo.png" alt="logo" />
        <span>{import.meta.env.VITE_APP_NAME || 'Logistics 1'}</span>
      </div>
      <div>
        {user ? (
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <span className="muted">{user.name} · {user.role}</span>
            <button onClick={doLogout}>Logout</button>
          </div>
        ) : (
          <button className="primary" onClick={()=>nav('/login')}>Login</button>
        )}
      </div>
    </div>
  );
}
