import { useQuery } from "@tanstack/react-query";
import { inv } from "../../api/http";
import useAuth from "../../hooks/useAuth";
import { can, PERMS } from "../../utils/rbac";

export default function Balances(){
  const { user } = useAuth();
  const ok = can(user?.role, PERMS.INVENTORY_VIEW);

  const { data, isLoading, error } = useQuery({
    queryKey:["inv-balances"],
    queryFn: async () => {
      const r = await inv.get("/inventory");
      return r.data?.data ?? [];
    },
    enabled: ok,
  });

  if (!ok) return <NoAccess />;
  if (isLoading) return <p className="muted">Loading…</p>;
  if (error) return <p className="err">Error: {String(error.message || error)}</p>;

  return (
    <div>
      <h2>Inventory Balances</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th><th>Description</th><th>Location</th><th>Bin</th>
              <th>Lot</th><th>Expiry</th><th className="num">On hand</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row=>(
              <tr key={row.balanceId}>
                <td>{row.itemCode}</td>
                <td className="muted">{row.description}</td>
                <td>{row.locationId}</td>
                <td>{row.binId ?? "-"}</td>
                <td>{row.lotNo ?? "-"}</td>
                <td>{row.expiryDate ? String(row.expiryDate).slice(0,10) : "-"}</td>
                <td className="num">{row.onHand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NoAccess(){
  return <p className="err">You don’t have permission to view inventory.</p>;
}
