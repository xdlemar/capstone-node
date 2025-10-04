import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type InventoryLocation = {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateInventoryLocationInput = {
  name: string;
  kind: string;
};

export function useInventoryLocations() {
  return useQuery<InventoryLocation[]>({
    queryKey: ["inventory", "locations"],
    queryFn: async () => {
      const { data } = await api.get<InventoryLocation[]>("/inventory/locations");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateInventoryLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInventoryLocationInput) => {
      const { data } = await api.post<InventoryLocation>("/inventory/locations", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "locations"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "lookups"] });
    },
  });
}