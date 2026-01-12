import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { DeliveryStatus } from "@/hooks/usePltData";

export type VendorShipmentUpdate = {
  id: string;
  status: DeliveryStatus;
  message: string | null;
  place: string | null;
  occurredAt: string;
};

export type VendorShipment = {
  id: string;
  poId: string | null;
  vendorId: string | null;
  status: DeliveryStatus;
  trackingNo: string | null;
  eta: string | null;
  departedAt: string | null;
  arrivedAt: string | null;
  lastKnown: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    code: string;
    name: string;
  } | null;
  updates: VendorShipmentUpdate[];
};

export function useVendorShipments(params: { poId?: string } = {}) {
  return useQuery<VendorShipment[]>({
    queryKey: ["vendor", "shipments", params],
    queryFn: async () => {
      const { data } = await api.get<VendorShipment[]>("/plt/vendor/shipments", {
        params: {
          poId: params.poId,
        },
      });
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
  });
}
