import useAuth from "../../hooks/useAuth";
import { can } from "../../utils/rbac";

export default function Dashboard(){
  const { user } = useAuth();
  const role = user?.role;

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome, {user?.name} — <b>{role}</b></p>

      {can(role,"alerts.view") && (
        <section className="card">
          <h3>Alerts</h3>
          <ul>
            <li>Low stock / Expiry soon (connect to /api/v1/alerts later)</li>
          </ul>
        </section>
      )}

      {can(role,"procurement.view") && (
        <section className="card">
          <h3>Procurement Quick Links</h3>
          <ul>
            <li>View POs</li>
            <li>Create GRN</li>
          </ul>
        </section>
      )}

      {can(role,"system.maintain") && (
        <section className="card">
          <h3>IT – System Maintenance</h3>
          <ul>
            <li>Health checks</li>
            <li>Backup schedule</li>
            <li>Security logs</li>
          </ul>
        </section>
      )}
    </div>
  );
}
