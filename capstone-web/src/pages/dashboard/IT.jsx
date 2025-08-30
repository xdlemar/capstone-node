import { Link } from 'react-router-dom';

export default function IT(){
  return (
    <div>
      <h2>IT Dashboard</h2>
      <ul className="links">
        <li><Link to="/inventory">Inventory (read-only)</Link></li>
        {/* add system/health page later */}
      </ul>
    </div>
  );
}
