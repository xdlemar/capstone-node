import { useMutation } from '@tanstack/react-query';
import { prc } from '../../api/http';

export default function Tools(){
  const seed = useMutation({ mutationFn: ()=>prc.post('/auth/seed-admin').then(r=>r.data) });

  return (
    <div>
      <h2>Admin Tools</h2>
      <button onClick={()=>seed.mutate()} disabled={seed.isPending}>Seed Admin</button>
      {seed.isSuccess && <p className="muted">Admin re-seeded.</p>}
    </div>
  );
}
