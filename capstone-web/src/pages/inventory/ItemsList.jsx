import { useQuery } from '@tanstack/react-query';
import { getInventory } from '../../api/inventory';

export default function ItemsList(){
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory','all'],
    queryFn: () => getInventory().then(r => r.data)
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p style={{color:'var(--danger)'}}>Error: {String(error.message || error)}</p>;

  const rows = data?.data || [];

  return (
    <div>
      <h2>Inventory Balances</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Item</th><th>Location</th><th>Bin</th><th>Lot</th><th>Expiry</th><th>On Hand</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.balanceId}>
              <td>{r.itemCode} — {r.description}</td>
              <td>{r.locationId}</td>
              <td>{r.binId ?? '-'}</td>
              <td>{r.lotNo}</td>
              <td>{r.expiryDate ?? '-'}</td>
              <td>{Number(r.onHand)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
