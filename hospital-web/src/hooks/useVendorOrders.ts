import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type VendorOrderSummary = {
  id: string;
  poNo: string;
  status: string;
  orderedAt: string;
  vendor: { id: string; name: string };
  lineCount: number;
  totalQty: number;
  linesPreview?: VendorOrderLine[];
  vendorAcknowledgedAt?: string | null;
  vendorAcknowledgedBy?: string | null;
  vendorNote?: string | null;
};

export type VendorOrderLine = {
  id: string;
  itemId: string;
  itemName?: string | null;
  itemSku?: string | null;
  itemUnit?: string | null;
  itemStrength?: string | null;
  itemType?: string | null;
  qty: number;
  unit: string;
  price: number;
  notes?: string | null;
};

export type VendorOrderDetail = {
  id: string;
  poNo: string;
  status: string;
  orderedAt: string;
  vendor: { id: string; name: string };
  vendorAcknowledgedAt?: string | null;
  vendorAcknowledgedBy?: string | null;
  vendorNote?: string | null;
  lines: VendorOrderLine[];
};

export function useVendorOrders() {
  return useQuery<VendorOrderSummary[]>({
    queryKey: ["vendor", "orders"],
    queryFn: async () => {
      const { data } = await api.get<VendorOrderSummary[]>("/procurement/vendor/pos");
      return data;
    },
    staleTime: 1000 * 60,
  });
}

export function useVendorOrder(orderId?: string) {
  return useQuery<VendorOrderDetail>({
    queryKey: ["vendor", "orders", orderId],
    queryFn: async () => {
      const { data } = await api.get<VendorOrderDetail>(`/procurement/vendor/pos/${orderId}`);
      return data;
    },
    enabled: !!orderId,
    staleTime: 1000 * 30,
  });
}
