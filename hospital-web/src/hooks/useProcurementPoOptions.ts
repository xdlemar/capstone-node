import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ProcurementPoOption = {
  id: string;
  poNo: string;
  prNo: string | null;
  vendorName: string | null;
  status: string;
  orderedAt: string;
};

export function useProcurementPoOptions(options: { enabled?: boolean } = {}) {
  return useQuery<ProcurementPoOption[]>({
    queryKey: ["procurement", "po-options"],
    queryFn: async () => {
      const { data } = await api.get<ProcurementPoOption[]>("/procurement/lookups/po-options");
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}
