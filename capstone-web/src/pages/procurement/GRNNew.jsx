import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { createGRN } from '../../api/procurement';

export default function GRNNew(){
  const { register, handleSubmit } = useForm({
    defaultValues: {
      poId:1, poLineId:1, itemId:1, qtyReceived:50, uomCode:'EA',
      lotNo:'B24-093', expiryDate:'2026-12-31', locationId:1, binId:1
    }
  });

  const m = useMutation({
    mutationFn: (v) => createGRN({
      poId: Number(v.poId),
      lines: [{
        poLineId: Number(v.poLineId),
        itemId: Number(v.itemId),
        qtyReceived: Number(v.qtyReceived),
        uomCode: v.uomCode,
        lotNo: v.lotNo,
        expiryDate: v.expiryDate,
        locationId: Number(v.locationId),
        binId: Number(v.binId)
      }]
    }).then(r=>r.data)
  });

  return (
    <div>
      <h2>Create GRN</h2>
      <form onSubmit={handleSubmit((v)=>m.mutate(v))} className="grid" style={{maxWidth:600}}>
        <input {...register('poId')} placeholder="PO ID" />
        <input {...register('poLineId')} placeholder="PO Line ID" />
        <input {...register('itemId')} placeholder="Item ID" />
        <input {...register('qtyReceived')} placeholder="Qty" />
        <input {...register('uomCode')} placeholder="UOM" />
        <input {...register('lotNo')} placeholder="Lot No" />
        <input {...register('expiryDate')} placeholder="YYYY-MM-DD" />
        <input {...register('locationId')} placeholder="Location ID" />
        <input {...register('binId')} placeholder="Bin ID" />
        <button className="primary" type="submit" disabled={m.isPending}>Create</button>
        {m.isSuccess && <p>GRN #{m.data?.grnId} created</p>}
        {m.isError && <p style={{color:'var(--danger)'}}>Error: {String(m.error?.response?.data?.message || m.error?.message || m.error)}</p>}
      </form>
    </div>
  );
}
