import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type VendorSummary = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type VendorUserLink = {
  id: string;
  vendorId: string;
  userId: string;
  createdAt: string;
};

export function useProcurementVendors() {
  return useQuery<VendorSummary[]>({
    queryKey: ["procurement", "vendors"],
    queryFn: async () => {
      const { data } = await api.get<VendorSummary[]>("/procurement/vendors");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useVendorLinks(vendorId?: string) {
  return useQuery<VendorUserLink[]>({
    queryKey: ["vendor", "links", vendorId],
    queryFn: async () => {
      const { data } = await api.get<VendorUserLink[]>(`/procurement/vendors/${vendorId}/users`);
      return data;
    },
    enabled: !!vendorId,
    staleTime: 1000 * 30,
  });
}
