import { useForm } from "react-hook-form";

export default function IssueForm(){
  // placeholder UI for now
  const { register, handleSubmit, reset } = useForm({ defaultValues:{ itemId:"", qty:"", toDept:"" }});
  const onSubmit = (v)=>{ alert("Issue (stub): " + JSON.stringify(v)); reset(); };

  return (
    <div>
      <h2>Issue Stock (Stub)</h2>
      <p className="muted">Hook up to /issues endpoint later.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="grid">
        <input {...register("itemId")} placeholder="Item ID"/>
        <input {...register("qty")} placeholder="Qty"/>
        <input {...register("toDept")} placeholder="To Dept/Ward"/>
        <button>Record Issue</button>
      </form>
    </div>
  );
}
