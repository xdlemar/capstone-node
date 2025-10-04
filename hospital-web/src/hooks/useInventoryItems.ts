import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  minQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertInventoryItemInput = {
  sku: string;
  name: string;
  unit: string;
  minQty: number;
};

type RawInventoryItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  minQty: string | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function normalizeItem(raw: RawInventoryItem): InventoryItem {
  const minQty = Number(raw.minQty);
  return {
    ...raw,
    minQty: Number.isFinite(minQty) ? minQty : 0,
  };
}

export function useInventoryItems() {
  return useQuery<InventoryItem[]>({
    queryKey: ["inventory", "items"],
    queryFn: async () => {
      const { data } = await api.get<RawInventoryItem[]>("/inventory/items");
      return data.map(normalizeItem);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpsertInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertInventoryItemInput) => {
      const { data } = await api.post<RawInventoryItem>("/inventory/items", payload);
      return normalizeItem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "lookups"] });
    },
  });
}