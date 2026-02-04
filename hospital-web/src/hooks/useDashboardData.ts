import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ProcurementSummary = {
  openRequests: number;
  pendingApprovals: number;
  openPurchaseOrders: number;
  receiptsThisWeek: number;
};

export type InventorySummary = {
  lowStock: number;
  expiringSoon: number;
  expiringBatches: number;
  movementsSeries: number[];
  alerts: Array<{
    id: string;
    title: string;
    detail: string;
    type: string;
    createdAt: string;
  }>;
};

export type AssetFinancialSummary = {
  acquisitionValue: number;
  bookValue: number;
  maintenanceCost30d: number;
  maintenanceCostYtd: number;
  topAssetsByMaintenance: Array<{
    assetId: string;
    assetCode: string;
    status: string;
    category: string | null;
    spendYtd: number;
  }>;
};

export type AssetSummary = {
  activeAssets: number;
  openWorkOrders: number;
  maintenanceDueSoon: number;
  financials?: AssetFinancialSummary;
};

export type LogisticsCostSummary = {
  totalDeliverySpend: number;
  perProject: Array<{
    projectId: string;
    code: string;
    name: string;
    status: string;
    budget: number | null;
    deliveryCost: number;
  }>;
};

export type LogisticsSummary = {
  activeProjects: number;
  deliveriesInTransit: number;
  delayedDeliveries: number;
  alertsOpen: number;
  alerts: Array<{
    id: string;
    message: string;
    type: string;
    triggeredAt: string;
    delivery: {
      id: string;
      trackingNo: string | null;
      status: string | null;
    } | null;
  }>;
  deliveryCosts?: LogisticsCostSummary;
};

export type DocumentSummary = {
  totalDocuments: number;
  recentUploads: number;
  awaitingSignatures: number;
  recentDocs: Array<{
    id: string;
    title: string;
    module: string;
    createdAt: string;
  }>;
};

export type AuthSummary = {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  newThisWeek: number;
};

export type DashboardData = {
  procurement?: ProcurementSummary;
  inventory?: InventorySummary;
  assets?: AssetSummary;
  logistics?: LogisticsSummary;
  documents?: DocumentSummary;
  users?: AuthSummary;
};

export type DashboardUnavailableKey = keyof DashboardData;

export type DashboardFetchResult = {
  data: DashboardData;
  unavailable: DashboardUnavailableKey[];
  fetchedAt: string;
};

const SUMMARY_ENDPOINTS: Array<{
  key: keyof DashboardData;
  url: string;
}> = [
  { key: "procurement", url: "/procurement/dashboard/summary" },
  { key: "inventory", url: "/inventory/dashboard/summary" },
  { key: "assets", url: "/alms/dashboard/summary" },
  { key: "logistics", url: "/plt/dashboard/summary" },
  { key: "documents", url: "/dtrs/dashboard/summary" },
  { key: "users", url: "/auth/dashboard/summary" },
];

async function fetchDashboard(): Promise<DashboardFetchResult> {
  const unavailable: DashboardUnavailableKey[] = [];

  const settled = await Promise.allSettled(
    SUMMARY_ENDPOINTS.map((entry) =>
      api
        .get(entry.url)
        .then((res) => ({ key: entry.key, data: res.data }))
        .catch((err) => {
          if (err?.response?.status !== 403) {
            console.warn(`[dashboard] failed to load ${entry.url}`, err?.response?.status || err.message);
            unavailable.push(entry.key);
          }
          return null;
        })
    )
  );

  const data = settled.reduce<DashboardData>((acc, result) => {
    if (result.status === "fulfilled" && result.value) {
      acc[result.value.key] = result.value.data;
    }
    return acc;
  }, {});

  return { data, unavailable, fetchedAt: new Date().toISOString() };
}

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: fetchDashboard,
    refetchInterval: 60_000,
    staleTime: 60_000,
    retry: false,
  });
}

