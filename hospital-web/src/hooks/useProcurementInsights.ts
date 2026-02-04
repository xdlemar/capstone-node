import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ProcurementInsightResponse = {
  topVendorsByOrders: Array<{
    vendorId: string;
    vendorName: string;
    contact: { email: string | null; phone: string | null };
    orderCount: number;
    totalQty: number;
  }>;
  topItemsByQty: Array<{
    itemId: string;
    totalQty: number;
    orderLines: number;
  }>;
};

export function useProcurementInsights() {
  return useQuery<ProcurementInsightResponse>({
    queryKey: ["procurement", "insights"],
    queryFn: async () => {
      const { data } = await api.get<ProcurementInsightResponse>("/procurement/insights");
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

