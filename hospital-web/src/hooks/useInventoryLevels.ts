import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type InventoryLevelRow = {
  itemId: string;
  sku: string;
  name: string;
  onhand: number;
};

export function useInventoryLevels(locationId?: string) {
  return useQuery<InventoryLevelRow[]>({
    queryKey: ["inventory", "levels", locationId ?? "all"],
    queryFn: async () => {
      const { data } = await api.get<InventoryLevelRow[]>("/inventory/reports/levels", {
        params: locationId ? { locationId } : undefined,
      });
      return data.map((row) => ({ ...row, onhand: Number(row.onhand) }));
    },
    staleTime: 1000 * 60 * 5,
  });
}
