import AppRoutes from './routes/AppRoutes';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import useAuth from './hooks/useAuth';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="shell">
      <Topbar />
      <div className="main">
        {user && <Sidebar />} {/* show sidebar only when logged in */}
        <div className="content">
          <AppRoutes />
        </div>
      </div>
    </div>
  );
}
