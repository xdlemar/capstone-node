import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { listDocs, createDoc, listDocMoves, createDocMove } from "../../api/ops";

export default function Documents(){
  const qc = useQueryClient();
  const q = useQuery({ queryKey:["documents"], queryFn: ()=>listDocs().then(r=>r.data) });

  const { register, handleSubmit, reset } = useForm({
    defaultValues:{ docNo:"DTR-0001", title:"Receiving Checklist", category:"Logistics", ownerDept:"SWS" }
  });
  const m = useMutation({
    mutationFn: (v)=>createDoc(v).then(r=>r.data),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["documents"]}); reset(); }
  });

  return (
    <div>
      <h2>Documents</h2>

      <form onSubmit={handleSubmit((v)=>m.mutate(v))} className="grid">
        <input {...register("docNo")} placeholder="Doc No" />
        <input {...register("title")} placeholder="Title" />
        <input {...register("category")} placeholder="Category" />
        <input {...register("ownerDept")} placeholder="Owner Dept" />
        <button disabled={m.isPending}>Create</button>
      </form>

      {q.data?.map(d => <DocCard key={d.id} d={d} />)}
    </div>
  );
}

function DocCard({ d }){
  const { data: moves=[] } = useQuery({
    queryKey:["doc-moves", d.id],
    queryFn: ()=>listDocMoves(d.id).then(r=>r.data)
  });
  const { register, handleSubmit, reset } = useForm({ defaultValues:{ action:"Forward", from:"", to:"", by:"" }});
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (v)=>createDocMove(d.id, v).then(r=>r.data),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["doc-moves", d.id]}); reset({ action:"Forward", from:"", to:"", by:"" }); }
  });

  return (
    <section className="card">
      <h3>{d.docNo} — {d.title}</h3>
      <small>{d.category || "-"} | {d.status}</small>

      <ul>
        {moves.map(mv => (
          <li key={mv.id}>
            {mv.at?.slice(0,10)} — {mv.action}
            {mv.from?` from ${mv.from}`:""}{mv.to?` to ${mv.to}`:""}{mv.by?` by ${mv.by}`:""}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit((v)=>m.mutate(v))} className="grid">
        <input {...register("action")} placeholder="Action" />
        <input {...register("from")} placeholder="From" />
        <input {...register("to")} placeholder="To" />
        <input {...register("by")} placeholder="By" />
        <button>Log Move</button>
      </form>
    </section>
  );
}
