import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type DemandForecastItem = {
  itemId: string;
  sku: string;
  name: string;
  unit: string | null;
  onHand: number;
  avgDailyUsage: number;
  forecast7d: number;
  forecastHorizon: number;
  horizonDays: number;
  minQty: number;
  reorderPoint: number;
  suggestedReorder: number;
  daysToStockout: number | null;
  risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
};

export type DemandForecastResponse = {
  generatedAt: string;
  windowDays: number;
  horizonDays: number;
  leadTimeDays: number;
  safetyFactor: number;
  locationId: string | null;
  source: "azure" | "heuristic";
  items: DemandForecastItem[];
};

export function useInventoryForecast(locationId?: string) {
  return useQuery<DemandForecastResponse>({
    queryKey: ["inventory", "forecast", "demand", locationId ?? "all"],
    queryFn: async () => {
      const { data } = await api.get<DemandForecastResponse>("/inventory/forecast/demand", {
        params: locationId ? { locationId } : undefined,
      });
      return {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          onHand: Number(item.onHand),
          avgDailyUsage: Number(item.avgDailyUsage),
          forecast7d: Number(item.forecast7d),
          forecastHorizon: Number(item.forecastHorizon),
          reorderPoint: Number(item.reorderPoint),
          suggestedReorder: Number(item.suggestedReorder),
        })),
      };
    },
    staleTime: 60_000,
  });
}
