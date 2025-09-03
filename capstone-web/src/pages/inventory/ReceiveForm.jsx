import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { inv } from "../../api/http";
import useAuth from "../../hooks/useAuth";
import { can, PERMS } from "../../utils/rbac";

export default function ReceiveForm(){
  const { user } = useAuth();
  const ok = can(user?.role, PERMS.INVENTORY_TX);

  const { register, handleSubmit, reset } = useForm({
    defaultValues:{ itemId:1, qty:10, uomCode:"EA", locationId:1, binId:1, lotNo:"B24-100", expiryDate:"2026-12-31" }
  });

  const m = useMutation({
    mutationFn: async (v)=> (await inv.post("/receipts", v)).data,
    onSuccess: ()=> reset()
  });

  if (!ok) return <p className="err">You don’t have permission to receive items.</p>;

  return (
    <div>
      <h2>Receive Stock (Direct)</h2>
      <form onSubmit={handleSubmit(v=>m.mutate(v))} className="grid">
        <input {...register("itemId")} placeholder="Item ID" />
        <input {...register("qty")} placeholder="Qty" />
        <input {...register("uomCode")} placeholder="UOM" />
        <input {...register("locationId")} placeholder="Location ID" />
        <input {...register("binId")} placeholder="Bin ID (optional)" />
        <input {...register("lotNo")} placeholder="Lot No" />
        <input {...register("expiryDate")} placeholder="YYYY-MM-DD (optional)" />
        <button disabled={m.isPending}>Receive</button>
      </form>
      {m.isError && <p className="err">Error: {String(m.error?.response?.data?.message || m.error?.message || m.error)}</p>}
      {m.isSuccess && <p className="ok">Received.</p>}
    </div>
  );
}
