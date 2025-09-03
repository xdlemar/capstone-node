import { useForm } from "react-hook-form";

export default function AdjustForm(){
  const { register, handleSubmit, reset } = useForm({ defaultValues:{ itemId:"", qty:"", reason:"" }});
  const onSubmit = (v)=>{ alert("Adjust (stub): " + JSON.stringify(v)); reset(); };

  return (
    <div>
      <h2>Adjust (Stub)</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="grid">
        <input {...register("itemId")} placeholder="Item ID"/>
        <input {...register("qty")} placeholder="Qty (+/-)"/>
        <input {...register("reason")} placeholder="Reason"/>
        <button>Adjust</button>
      </form>
    </div>
  );
}
