import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ProcurementInsightResponse = {
  topVendorsBySpend: Array<{
    vendorId: string;
    vendorName: string;
    contact: { email: string | null; phone: string | null };
    totalSpend: number;
    onTimePercentage: number | null;
    avgLeadTimeDays: number | null;
    fulfillmentRate: number | null;
    lastEvaluatedAt: string | null;
  }>;
  vendorSpendShare: Array<{
    vendorId: string;
    vendorName: string;
    totalSpend: number;
  }>;
  priceLeaders: Array<{
    itemId: string;
    bestVendor: {
      vendorId: string;
      vendorName: string;
      avgPrice: number;
    };
    averagePrice: number;
    savingsPercent: number;
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

