import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ProcurementLookupLine = {
  id: string;
  itemId: string;
  qty: number;
  unit: string;
  notes?: string | null;
};

export type ProcurementLookups = {
  submittedPrs: Array<{
    id: string;
    prNo: string;
    createdAt: string;
    notes?: string | null;
    lines: ProcurementLookupLine[];
  }>;
  approvedPrs: Array<{
    id: string;
    prNo: string;
    createdAt: string;
    notes?: string | null;
    lines: ProcurementLookupLine[];
  }>;
  vendors: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    metrics: null | {
      onTimePercentage: number | null;
      avgLeadTimeDays: number | null;
      fulfillmentRate: number | null;
      totalSpend: number;
      lastEvaluatedAt: string | null;
    };
  }>;
  openPos: Array<{
    id: string;
    poNo: string;
    prNo: string | null;
    vendorName: string | null;
    status: string;
    orderedAt: string;
    lines: ProcurementLookupLine[];
  }>;
};

export function useProcurementLookups() {
  return useQuery<ProcurementLookups>({
    queryKey: ["procurement", "lookups"],
    queryFn: async () => {
      const { data } = await api.get<ProcurementLookups>("/procurement/lookups/procurement");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
