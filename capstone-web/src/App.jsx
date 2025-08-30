import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import AppRoutes from "./routes/AppRoutes";

export default function App(){
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="container">
          <AppRoutes />
        </div>
      </main>
    </div>
  );
}
