import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { listAssets, createAsset, listMaint, createMaint } from "../../api/ops";

export default function Assets(){
  const qc = useQueryClient();
  const q = useQuery({ queryKey:["assets"], queryFn: ()=>listAssets().then(r=>r.data) });

  const { register, handleSubmit, reset } = useForm({
    defaultValues:{ tag:"AST-1001", name:"Refrigerator", category:"Equipment", status:"IN_SERVICE" }
  });
  const m = useMutation({
    mutationFn: (v)=>createAsset(v).then(r=>r.data),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["assets"]}); reset(); }
  });

  return (
    <div>
      <h2>Assets</h2>

      <form onSubmit={handleSubmit((v)=>m.mutate(v))} className="grid">
        <input {...register("tag")} placeholder="Tag" />
        <input {...register("name")} placeholder="Name" />
        <input {...register("category")} placeholder="Category" />
        <select {...register("status")}>
          <option>IN_SERVICE</option><option>MAINTENANCE</option><option>RETIRED</option>
        </select>
        <button disabled={m.isPending}>Add Asset</button>
      </form>

      {q.data?.map(a => <AssetCard key={a.id} a={a} />)}
    </div>
  );
}

function AssetCard({ a }){
  const { data: rows=[] } = useQuery({
    queryKey:["maint", a.id],
    queryFn: ()=>listMaint(a.id).then(r=>r.data)
  });
  const { register, handleSubmit, reset } = useForm({ defaultValues:{ type:"PM", scheduledAt:"" }});
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (v)=>createMaint(a.id, v).then(r=>r.data),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["maint", a.id]}); reset({ type:"", scheduledAt:"" }); }
  });

  return (
    <section className="card">
      <h3>{a.tag} — {a.name}</h3>
      <small>{a.category || "-"} | {a.status}</small>

      <ul>
        {rows.map(r => <li key={r.id}>{r.type} — {r.scheduledAt?.slice(0,10) || ""} {r.completedAt? "✓" : ""}</li>)}
      </ul>

      <form onSubmit={handleSubmit((v)=>m.mutate(v))} className="grid">
        <input {...register("type")} placeholder="Type (PM/Repair)" />
        <input {...register("scheduledAt")} placeholder="YYYY-MM-DD" />
        <input {...register("notes")} placeholder="Notes" />
        <button>Schedule</button>
      </form>
    </section>
  );
}
