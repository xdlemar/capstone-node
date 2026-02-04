import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type FlaggedBatch = {
  id: string;
  itemId: string;
  lotNo: string | null;
  expiryDate: string | null;
  qtyOnHand: number;
  status: "EXPIRED" | "QUARANTINED" | "DISPOSED" | string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string | null;
    type: string | null;
  } | null;
};

export function useInventoryFlaggedBatches(statuses: string[] = ["EXPIRED", "QUARANTINED"]) {
  return useQuery<FlaggedBatch[]>({
    queryKey: ["inventory", "batches", "flagged", statuses.join(",")],
    queryFn: async () => {
      const { data } = await api.get<FlaggedBatch[]>("/inventory/batches/flagged", {
        params: { statuses: statuses.join(",") },
      });
      return data.map((row) => ({
        ...row,
        qtyOnHand: Number(row.qtyOnHand ?? 0),
      }));
    },
    staleTime: 1000 * 60 * 3,
  });
}
