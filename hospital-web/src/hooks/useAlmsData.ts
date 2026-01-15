import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type AssetStatus = "ACTIVE" | "UNDER_MAINTENANCE" | "RETIRED" | "DISPOSED";
export type MaintenanceType = "PREVENTIVE" | "CORRECTIVE" | "INSPECTION" | "CALIBRATION";
export type WorkOrderStatus = "OPEN" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type AssetRecord = {
  id: string;
  assetCode: string;
  name: string;
  category: string | null;
  status: AssetStatus;
  locationId: string | null;
  warrantyUntil: string | null;
  purchaseDate: string | null;
  serialNo: string | null;
  notes: string | null;
};

export type WorkOrderRecord = {
  id: string;
  woNo: string;
  assetId: string;
  type: MaintenanceType;
  status: WorkOrderStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cost: number | null;
  technician: string | null;
  notes: string | null;
  createdAt: string;
};

export type ScheduleRecord = {
  id: string;
  assetId: string;
  type: MaintenanceType;
  intervalDays: number | null;
  nextDue: string | null;
  notes: string | null;
};

export type AlertRecord = {
  id: string;
  assetId: string;
  scheduleId: string | null;
  type: string;
  message: string;
  triggeredAt: string;
  resolvedAt: string | null;
  asset: {
    id: string;
    assetCode: string;
    status: AssetStatus;
  };
  schedule: {
    id: string;
    nextDue: string | null;
    type: MaintenanceType;
  } | null;
};

export type FinancialSummary = {
  assetId: string;
  totals: {
    depreciation: number;
    maintenance: number;
    latestBookValue: number | null;
  };
  periods: Array<{
    periodStart: string;
    periodEnd: string;
    depreciation: number;
    maintenanceCost: number;
    bookValue: number;
  }>;
};

export type MaintenanceForecastItem = {
  assetId: string;
  assetCode: string;
  name: string;
  category: string | null;
  status: AssetStatus;
  historyCount: number;
  lastCompletedAt: string | null;
  avgIntervalDays: number | null;
  nextDueAt: string | null;
  risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  confidence: "LOW" | "MEDIUM" | "HIGH";
};

export type MaintenanceForecastResponse = {
  generatedAt: string;
  windowDays: number;
  minEvents: number;
  source: "azure" | "heuristic";
  items: MaintenanceForecastItem[];
};

export const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  OPEN: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function useAlmsAssets(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["alms", "assets"],
    queryFn: async () => {
      const { data } = await api.get<{ total: number; rows: AssetRecord[] }>("/alms/assets");
      return {
        total: data.total,
        rows: data.rows.map((asset) => ({
          ...asset,
          name: asset.name?.trim() || asset.assetCode,
        })),
      };
    },
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}

export function useAlmsWorkOrders(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["alms", "workorders"],
    queryFn: async () => {
      const { data } = await api.get<{ total: number; rows: WorkOrderRecord[] }>("/alms/workorders");
      return data;
    },
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}

export function useAlmsSchedules() {
  return useQuery({
    queryKey: ["alms", "schedules"],
    queryFn: async () => {
      const { data } = await api.get<{ total: number; rows: ScheduleRecord[] }>("/alms/schedules");
      return data;
    },
    staleTime: 30_000,
  });
}

export function useAlmsAlerts(unresolvedOnly = true) {
  return useQuery({
    queryKey: ["alms", "alerts", unresolvedOnly],
    queryFn: async () => {
      const { data } = await api.get<AlertRecord[]>("/alms/alerts", {
        params: { unresolved: unresolvedOnly },
      });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useAlmsFinancialSummary(assetId?: string) {
  return useQuery({
    queryKey: ["alms", "financial", assetId ?? "none"],
    enabled: Boolean(assetId),
    queryFn: async () => {
      const { data } = await api.get<FinancialSummary>("/alms/financial/summary", {
        params: { assetId },
      });
      return data;
    },
  });
}

export function useAlmsMaintenanceForecast() {
  return useQuery<MaintenanceForecastResponse>({
    queryKey: ["alms", "forecast", "maintenance"],
    queryFn: async () => {
      const { data } = await api.get<MaintenanceForecastResponse>("/alms/forecast/maintenance");
      return data;
    },
    staleTime: 60_000,
  });
}

