import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type VendorDamagePhoto = {
  id: string;
  storageKey: string;
  url: string | null;
  mimeType?: string | null;
  size?: number | null;
  checksum?: string | null;
  createdAt: string;
};

export type VendorDamageLine = {
  id: string;
  itemId: string;
  itemName?: string | null;
  itemSku?: string | null;
  qtyReceived: number;
  qtyDamaged: number;
  damageReason?: string | null;
  damageNotes?: string | null;
  photos: VendorDamagePhoto[];
};

export type VendorDamageReceipt = {
  id: string;
  receivedAt: string;
  drNo?: string | null;
  invoiceNo?: string | null;
  lines: VendorDamageLine[];
};

export type VendorDamageResponse = {
  poId: string;
  poNo: string;
  receipts: VendorDamageReceipt[];
};

export function useVendorDamages(poId?: string) {
  return useQuery<VendorDamageResponse>({
    queryKey: ["vendor", "damages", poId],
    queryFn: async () => {
      const { data } = await api.get<VendorDamageResponse>(`/procurement/vendor/pos/${poId}/damages`);
      return data;
    },
    enabled: Boolean(poId),
    staleTime: 1000 * 60,
  });
}
