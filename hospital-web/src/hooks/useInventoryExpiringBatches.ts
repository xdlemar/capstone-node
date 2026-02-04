import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ExpiringBatch = {
  id: string;
  itemId: string;
  lotNo: string | null;
  expiryDate: string | null;
  qtyOnHand: number;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string | null;
    type: string | null;
  } | null;
};

export type ExpiringBatchQuery = {
  windowDays?: number;
  take?: number;
};

export function useInventoryExpiringBatches({ windowDays = 30, take = 50 }: ExpiringBatchQuery = {}) {
  return useQuery<ExpiringBatch[]>({
    queryKey: ["inventory", "batches", "expiring", windowDays, take],
    queryFn: async () => {
      const { data } = await api.get<ExpiringBatch[]>("/inventory/batches/expiring", {
        params: { windowDays, take },
      });
      return data.map((row) => ({
        ...row,
        qtyOnHand: Number(row.qtyOnHand ?? 0),
      }));
    },
    staleTime: 1000 * 60 * 3,
  });
}
