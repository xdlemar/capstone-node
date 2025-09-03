import { useForm } from "react-hook-form";

export default function TransferForm(){
  const { register, handleSubmit, reset } = useForm({ defaultValues:{ itemId:"", qty:"", fromBin:"", toBin:"" }});
  const onSubmit = (v)=>{ alert("Transfer (stub): " + JSON.stringify(v)); reset(); };

  return (
    <div>
      <h2>Transfer (Stub)</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="grid">
        <input {...register("itemId")} placeholder="Item ID"/>
        <input {...register("qty")} placeholder="Qty"/>
        <input {...register("fromBin")} placeholder="From Bin"/>
        <input {...register("toBin")} placeholder="To Bin"/>
        <button>Transfer</button>
      </form>
    </div>
  );
}
