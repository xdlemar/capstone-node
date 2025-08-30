import { Link } from 'react-router-dom';

export default function Admin(){
  return (
    <div>
      <h2>Admin Dashboard</h2>
      <ul className="links">
        <li><Link to="/inventory">Inventory Balances</Link></li>
        <li><Link to="/inventory/receive">Receive</Link></li>
        <li><Link to="/procurement/grn/new">Create GRN</Link></li>
      </ul>
    </div>
  );
}
