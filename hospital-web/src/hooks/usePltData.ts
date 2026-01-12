import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const DELIVERY_STATUSES = ["DRAFT", "DISPATCHED", "IN_TRANSIT", "DELAYED", "DELIVERED", "CANCELLED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  DRAFT: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT", "DELAYED", "CANCELLED"],
  IN_TRANSIT: ["DELAYED", "DELIVERED", "CANCELLED"],
  DELAYED: ["IN_TRANSIT", "DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export type DeliveryUpdateRecord = {
  id: string;
  status: DeliveryStatus;
  message: string | null;
  place: string | null;
  occurredAt: string;
};

export type DeliveryRecord = {
  id: string;
  projectId: string;
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
    status: string;
  } | null;
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    triggeredAt: string;
    resolvedAt: string | null;
  }>;
  updates: DeliveryUpdateRecord[];
};

export type ProjectRecord = {
  id: string;
  code: string;
  name: string;
  status: string;
  managerId: string | null;
  budget: number | null;
  startsOn: string | null;
  endsOn: string | null;
  deliveriesCount: number;
  materialsCount: number;
  lastDelivery: {
    id: string;
    status: DeliveryStatus;
    trackingNo: string | null;
    eta: string | null;
    createdAt: string;
  } | null;
  updatedAt: string;
  createdAt: string;
};

export type PltSummary = {
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
      status: string;
    } | null;
  }>;
  deliveryCosts: {
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
};

function mapDelivery(raw: any): DeliveryRecord {
  return {
    id: raw.id?.toString() ?? "",
    projectId: raw.projectId?.toString() ?? "",
    status: raw.status,
    trackingNo: raw.trackingNo ?? null,
    eta: raw.eta ?? null,
    departedAt: raw.departedAt ?? null,
    arrivedAt: raw.arrivedAt ?? null,
    lastKnown: raw.lastKnown ?? null,
    notes: raw.notes ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    project: raw.project
      ? {
          id: raw.project.id?.toString() ?? "",
          code: raw.project.code ?? "",
          name: raw.project.name ?? "",
          status: raw.project.status ?? "",
        }
      : null,
    alerts: Array.isArray(raw.alerts)
      ? raw.alerts.map((alert: any) => ({
          id: alert.id?.toString() ?? "",
          type: alert.type,
          message: alert.message,
          triggeredAt: alert.triggeredAt,
          resolvedAt: alert.resolvedAt ?? null,
        }))
      : [],
    updates: Array.isArray(raw.updates)
      ? raw.updates.map((update: any) => ({
          id: update.id?.toString() ?? "",
          status: update.status,
          message: update.message ?? null,
          place: update.place ?? null,
          occurredAt: update.occurredAt,
        }))
      : [],
  };
}

export function usePltDeliveries(
  filters: { status?: DeliveryStatus; projectId?: string } = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery<DeliveryRecord[]>({
    queryKey: ["plt", "deliveries", filters],
    queryFn: async () => {
      const { data } = await api.get("/plt/deliveries", {
        params: {
          status: filters.status,
          projectId: filters.projectId,
          take: 100,
        },
      });

      return Array.isArray(data) ? data.map(mapDelivery) : [];
    },
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}

export function usePltAlerts(unresolvedOnly = true) {
  return useQuery({
    queryKey: ["plt", "alerts", unresolvedOnly],
    queryFn: async () => {
      const { data } = await api.get("/plt/alerts", {
        params: { unresolved: unresolvedOnly },
      });

      return Array.isArray(data)
        ? data.map((alert: any) => ({
            id: alert.id?.toString() ?? "",
            deliveryId: alert.deliveryId?.toString() ?? "",
            type: alert.type,
            message: alert.message,
            triggeredAt: alert.triggeredAt,
            resolvedAt: alert.resolvedAt ?? null,
            delivery: alert.delivery
              ? {
                  id: alert.delivery.id?.toString() ?? "",
                  projectId: alert.delivery.projectId?.toString() ?? "",
                  status: alert.delivery.status,
                  trackingNo: alert.delivery.trackingNo ?? null,
                  eta: alert.delivery.eta ?? null,
                }
              : null,
          }))
        : [];
    },
    staleTime: 15_000,
  });
}

export function usePltProjects(
  params: { status?: string; q?: string } = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery<ProjectRecord[]>({
    queryKey: ["plt", "projects", params],
    queryFn: async () => {
      const { data } = await api.get("/plt/projects", {
        params: {
          status: params.status,
          q: params.q,
        },
      });

      return Array.isArray(data)
        ? data.map((project: any) => ({
            id: project.id?.toString() ?? "",
            code: project.code,
            name: project.name,
            status: project.status,
            managerId: project.managerId ?? null,
            budget: project.budget ?? null,
            startsOn: project.startsOn ?? null,
            endsOn: project.endsOn ?? null,
            deliveriesCount: project.deliveriesCount ?? 0,
            materialsCount: project.materialsCount ?? 0,
            lastDelivery: project.lastDelivery
              ? {
                  id: project.lastDelivery.id?.toString() ?? "",
                  status: project.lastDelivery.status,
                  trackingNo: project.lastDelivery.trackingNo ?? null,
                  eta: project.lastDelivery.eta ?? null,
                  createdAt: project.lastDelivery.createdAt,
                }
              : null,
            updatedAt: project.updatedAt,
            createdAt: project.createdAt,
          }))
        : [];
    },
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}

export function usePltSummary(options: { enabled?: boolean } = {}) {
  return useQuery<PltSummary>({
    queryKey: ["plt", "summary"],
    queryFn: async () => {
      const { data } = await api.get<PltSummary>("/plt/dashboard/summary");
      return data;
    },
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}


