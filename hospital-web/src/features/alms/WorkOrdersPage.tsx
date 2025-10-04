import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useAlmsAssets, useAlmsWorkOrders, WORK_ORDER_TRANSITIONS, type WorkOrderRecord, type WorkOrderStatus } from "@/hooks/useAlmsData";

import { MaintenanceRequestDialog } from "./components/AssetDialogs";
import { WorkOrderStatusDialog } from "./components/WorkOrderDialogs";

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: "Open",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const ACTIVE_STATUSES: WorkOrderStatus[] = ["OPEN", "SCHEDULED", "IN_PROGRESS"];
const COMPLETED_STATUSES: WorkOrderStatus[] = ["COMPLETED", "CANCELLED"];

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function formatDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dateFormatter.format(dt);
}

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");
  const canRequest = roles.includes("STAFF") || isManager;

  const assetsQuery = useAlmsAssets();
  const workOrdersQuery = useAlmsWorkOrders();

  const assetMap = useMemo(() => {
    const map = new Map<string, { code: string; category: string | null }>();
    assetsQuery.data?.rows.forEach((asset) => {
      map.set(asset.id, { code: asset.assetCode, category: asset.category });
    });
    return map;
  }, [assetsQuery.data?.rows]);

  const { activeOrders, completedOrders, counts } = useMemo(() => {
    const bucket = {
      activeOrders: [] as WorkOrderRecord[],
      completedOrders: [] as WorkOrderRecord[],
      counts: {
        OPEN: 0,
        SCHEDULED: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      } as Record<WorkOrderStatus, number>,
    };

    workOrdersQuery.data?.rows.forEach((wo) => {
      bucket.counts[wo.status]++;
      if (ACTIVE_STATUSES.includes(wo.status)) {
        bucket.activeOrders.push(wo);
      } else {
        bucket.completedOrders.push(wo);
      }
    });

    return bucket;
  }, [workOrdersQuery.data?.rows]);

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Maintenance work orders</h1>
            <p className="text-muted-foreground max-w-3xl">
              Staff log requests; managers coordinate scheduling, technicians, and closure. Status changes stay restricted to manager/admin roles.
            </p>
          </div>
          {canRequest && (
            <MaintenanceRequestDialog
              assets={assetsQuery.data?.rows ?? []}
              trigger={<Button variant="outline">Request maintenance</Button>}
              onSubmitted={() => workOrdersQuery.refetch()}
            />
          )}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(["OPEN", "SCHEDULED", "IN_PROGRESS"] as WorkOrderStatus[]).map((status) => (
          <Card key={status} className="border bg-card shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {STATUS_LABELS[status]}
              </CardTitle>
              <CardDescription>{STATUS_SUMMARY[status]}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">
                {workOrdersQuery.isLoading ? "-" : counts[status] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Completed</CardTitle>
            <CardDescription>Closed or cancelled in the last cycle.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-foreground">
                {workOrdersQuery.isLoading ? "-" : counts.COMPLETED + counts.CANCELLED}
              </p>
              <Badge variant="secondary" className="text-xs">
                Done
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active">Active queue</TabsTrigger>
          <TabsTrigger value="completed">Completed & cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {workOrdersQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : activeOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active work orders at the moment.</p>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => {
                const assetInfo = assetMap.get(order.assetId);
                const transitions = WORK_ORDER_TRANSITIONS[order.status];
                return (
                  <OrderCard
                    key={order.id}
                    order={order}
                    assetCode={assetInfo?.code ?? `Asset ${order.assetId}`}
                    assetCategory={assetInfo?.category}
                    canAdvance={isManager && transitions.length > 0}
                    nextStatuses={transitions}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {workOrdersQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : completedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed records yet.</p>
          ) : (
            <div className="space-y-3">
              {completedOrders.map((order) => {
                const assetInfo = assetMap.get(order.assetId);
                return (
                  <OrderCard
                    key={order.id}
                    order={order}
                    assetCode={assetInfo?.code ?? `Asset ${order.assetId}`}
                    assetCategory={assetInfo?.category}
                    canAdvance={false}
                    nextStatuses={[]}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

const STATUS_SUMMARY: Record<WorkOrderStatus, string> = {
  OPEN: "Awaiting triage",
  SCHEDULED: "Planned work",
  IN_PROGRESS: "Technicians busy",
  COMPLETED: "Successfully closed",
  CANCELLED: "Cancelled",
};

interface OrderCardProps {
  order: WorkOrderRecord;
  assetCode: string;
  assetCategory?: string | null;
  canAdvance: boolean;
  nextStatuses: WorkOrderStatus[];
}

function OrderCard({ order, assetName, assetCode, assetCategory, canAdvance, nextStatuses }: OrderCardProps) {
  return (
    <Card className="border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold text-foreground">{order.woNo}</CardTitle>
          <CardDescription>
            {assetCode}
            {assetCategory ? ` • ${assetCategory}` : ""}
          </CardDescription>
        </div>
        {canAdvance ? (
          <WorkOrderStatusDialog
            workOrderId={order.id}
            workOrderNo={order.woNo}
            currentStatus={order.status}
            allowedStatuses={nextStatuses}
          />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{STATUS_LABELS[order.status]}</Badge>
          {order.technician ? <Badge variant="secondary">Tech: {order.technician}</Badge> : null}
        </div>
        <div className="grid gap-1 sm:grid-cols-2">
          <span>Created {formatDate(order.createdAt)}</span>
          {order.scheduledAt ? <span>Scheduled {formatDate(order.scheduledAt)}</span> : null}
          {order.startedAt ? <span>Started {formatDate(order.startedAt)}</span> : null}
          {order.completedAt ? <span>Completed {formatDate(order.completedAt)}</span> : null}
          {order.cost ? <span>Cost: {currency.format(Number(order.cost))}</span> : null}
        </div>
        {order.notes ? <p className="text-sm text-muted-foreground">{order.notes}</p> : null}
      </CardContent>
    </Card>
  );
}



