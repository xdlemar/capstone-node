import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { postReceipt } from '../../api/inventory';
import { createGRN } from '../../api/procurement';

export default function ReceiveForm(){
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      path:'inventory',
      itemId:1, qty:10, uomCode:'EA', locationId:1, binId:1, lotNo:'B24-100', expiryDate:'2026-12-31'
    }
  });
  const path = watch('path');

  const m = useMutation({
    mutationFn: async (values) => {
      if (values.path === 'inventory') {
        const { path, ...payload } = values;
        return postReceipt(payload).then(r => r.data);
      } else {
        const line = {
          poLineId: 1, // demo
          itemId: Number(values.itemId),
          qtyReceived: Number(values.qty),
          uomCode: values.uomCode,
          lotNo: values.lotNo,
          expiryDate: values.expiryDate,
          locationId: Number(values.locationId),
          binId: Number(values.binId)
        };
        return createGRN({ poId: 1, lines: [line] }).then(r => r.data);
      }
    }
  });

  return (
    <div>
      <h2>Receive Stock</h2>
      <form onSubmit={handleSubmit((v)=>m.mutate(v))} className="grid" style={{maxWidth: 600}}>
        <label>Route</label>
        <select {...register('path')}>
          <option value="inventory">Direct to Inventory /receipts</option>
          <option value="procurement">Via Procurement GRN</option>
        </select>

        <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap: 10}}>
          <input {...register('itemId')} placeholder="itemId" />
          <input {...register('qty')} placeholder="qty" />
          <input {...register('uomCode')} placeholder="uomCode" />
          <input {...register('locationId')} placeholder="locationId" />
          <input {...register('binId')} placeholder="binId" />
          <input {...register('lotNo')} placeholder="lotNo" />
          <input {...register('expiryDate')} placeholder="YYYY-MM-DD" />
        </div>

        <button className="primary" type="submit" disabled={m.isPending}>
          {path === 'inventory' ? 'Receive (Inventory)' : 'Receive via GRN'}
        </button>
        {m.isSuccess && <p>✅ Done</p>}
        {m.isError && <p style={{color:'var(--danger)'}}>Error: {String(m.error?.response?.data?.message || m.error?.message || m.error)}</p>}
      </form>
    </div>
  );
}
