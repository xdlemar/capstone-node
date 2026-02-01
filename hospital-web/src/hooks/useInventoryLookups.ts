import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type InventoryLookupResponse = {
  items: Array<{
    id: string;
    sku: string;
    name: string;
    strength?: string | null;
    unit: string;
    minQty: number;
  }>;
  locations: Array<{
    id: string;
    name: string;
    kind: string;
  }>;
};

export function useInventoryLookups() {
  return useQuery<InventoryLookupResponse>({
    queryKey: ["inventory", "lookups"],
    queryFn: async () => {
      const { data } = await api.get<InventoryLookupResponse>("/inventory/lookups/inventory");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
