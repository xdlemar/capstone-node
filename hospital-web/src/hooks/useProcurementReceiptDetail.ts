import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ProcurementReceiptDetail = {
  receipt: {
    id: string;
    drNo: string | null;
    invoiceNo: string | null;
    receivedAt: string;
    arrivalDate: string | null;
  };
  po: {
    id: string;
    poNo: string;
    status: string;
    orderedAt: string;
    vendorName: string | null;
  } | null;
  totals: {
    lineCount: number;
    totalQty: number;
    totalDamaged: number;
    totalGood: number;
  };
  lines: Array<{
    id: string;
    itemId: string;
    itemName: string | null;
    itemSku: string | null;
    unit: string | null;
    qty: number;
    qtyDamaged: number;
    qtyGood: number;
    lotNo: string | null;
    expiryDate: string | null;
  }>;
};

export function useProcurementReceiptDetail(receiptId?: string, options: { enabled?: boolean } = {}) {
  return useQuery<ProcurementReceiptDetail | null>({
    queryKey: ["procurement", "receipt-detail", receiptId],
    enabled: options.enabled ?? Boolean(receiptId),
    queryFn: async () => {
      if (!receiptId) return null;
      const { data } = await api.get<ProcurementReceiptDetail>(`/procurement/receipts/${receiptId}/detail`);
      return data;
    },
    staleTime: 60_000,
  });
}
