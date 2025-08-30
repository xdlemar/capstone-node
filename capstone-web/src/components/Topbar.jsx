import useAuth from "../hooks/useAuth";

export default function Topbar(){
  const { user, logout } = useAuth();
  return (
    <div className="topbar">
      <div>{import.meta.env.VITE_APP_NAME}</div>
      <div className="flex">
        {user && <span style={{marginRight:12}}>{user.name} — {user.role}</span>}
        {user && <button onClick={logout}>Logout</button>}
      </div>
    </div>
  );
}
