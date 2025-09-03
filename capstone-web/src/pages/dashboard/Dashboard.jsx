// src/pages/dashboard/Dashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { inv } from "../../api/http";
import  useAuth  from "../../hooks/useAuth";

const Card = ({ title, children }) => (
  <section className="card">
    <h3>{title}</h3>
    <div>{children}</div>
  </section>
);

export default function Dashboard() {
  const { user } = useAuth();

  const { data: alerts } = useQuery({
    queryKey:["alerts"],
    queryFn: () => inv.get("/alerts").then(r=>r.data),
  });

  return (
    <div className="container">
      <h2>Dashboard</h2>
      <p>Welcome, {user?.name} — <strong>{user?.role}</strong></p>

      <div className="grid-3">
        <Card title="Alerts">
          <ul className="list">
            {(alerts?.lowStock || []).map(a => (
              <li key={"ls-"+a.itemId}>
                <strong>{a.itemCode}</strong> low: {a.onHand} / min {a.minQty}
              </li>
            ))}
            {(alerts?.expiry || []).map(a => (
              <li key={"ex-"+a.lotId}>
                <strong>{a.itemCode}</strong> lot {a.lotNo} expires {String(a.expiryDate).slice(0,10)}
              </li>
            ))}
            {!alerts && <li>Low stock / Expiry soon</li>}
          </ul>
        </Card>

        <Card title="Procurement Quick Links">
          <ul className="list">
            <li><Link to="/procurement/pos">View POs</Link></li>
            <li><Link to="/procurement/grn/new">Create GRN</Link></li>
          </ul>
        </Card>

        <Card title="IT – System Maintenance">
          <ul className="list">
            <li>Health checks</li>
            <li>Backup schedule</li>
            <li>Security logs</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
