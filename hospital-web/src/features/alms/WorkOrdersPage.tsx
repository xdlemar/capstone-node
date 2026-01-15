import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAlmsAssets,
  useAlmsMaintenanceForecast,
  useAlmsWorkOrders,
  WORK_ORDER_TRANSITIONS,
  type MaintenanceType,
  type WorkOrderRecord,
  type WorkOrderStatus,
} from "@/hooks/useAlmsData";

import { MaintenanceRequestDialog } from "./components/AssetDialogs";
import { WorkOrderStatusDialog } from "./components/WorkOrderDialogs";

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: "Open",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_SUMMARY: Record<WorkOrderStatus, string> = {
  OPEN: "Awaiting triage",
  SCHEDULED: "Planned work",
  IN_PROGRESS: "Technicians busy",
  COMPLETED: "Successfully closed",
  CANCELLED: "Cancelled",
};

const ACTIVE_STATUSES: WorkOrderStatus[] = ["OPEN", "SCHEDULED", "IN_PROGRESS"];

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function formatDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dateFormatter.format(dt);
}

const STATUS_ORDER: Record<WorkOrderStatus, number> = {
  OPEN: 0,
  SCHEDULED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: 4,
};

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");
  const canRequest = roles.includes("STAFF") || isManager;

  const assetsQuery = useAlmsAssets();
  const workOrdersQuery = useAlmsWorkOrders();
  const maintenanceForecastQuery = useAlmsMaintenanceForecast();

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

  const forecastRows = useMemo(() => {
    const items = maintenanceForecastQuery.data?.items ?? [];
    return [...items].sort((a, b) => {
      const aDate = a.nextDueAt ? new Date(a.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.nextDueAt ? new Date(b.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
      if (aDate !== bDate) return aDate - bDate;
      return (b.historyCount ?? 0) - (a.historyCount ?? 0);
    });
  }, [maintenanceForecastQuery.data?.items]);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | MaintenanceType>("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");

  const typeOptions = useMemo(() => {
    const set = new Set<MaintenanceType>();
    workOrdersQuery.data?.rows.forEach((wo) => set.add(wo.type));
    return Array.from(set).sort();
  }, [workOrdersQuery.data?.rows]);

  const technicianOptions = useMemo(() => {
    const set = new Set<string>();
    workOrdersQuery.data?.rows.forEach((wo) => {
      if (wo.technician) {
        set.add(wo.technician);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [workOrdersQuery.data?.rows]);

  const filtersActive =
    searchTerm.trim().length > 0 || typeFilter !== "all" || technicianFilter !== "all" || sortOption !== "newest";

  const filterAndSortOrders = useMemo(() => {
    function matches(order: WorkOrderRecord) {
      const search = searchTerm.trim().toLowerCase();
      const assetInfo = assetMap.get(order.assetId);
      const matchesType = typeFilter === "all" || order.type === typeFilter;
      const matchesTechnician = technicianFilter === "all" || order.technician === technicianFilter;
      const matchesSearch =
        !search ||
        [order.woNo, order.notes, assetInfo?.code, assetInfo?.category, order.technician]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(search));
      return matchesType && matchesTechnician && matchesSearch;
    }

    function sortOrders(list: WorkOrderRecord[]) {
      const sorted = [...list];
      sorted.sort((a, b) => {
        if (sortOption === "asset") {
          const assetA = assetMap.get(a.assetId)?.code ?? a.assetId;
          const assetB = assetMap.get(b.assetId)?.code ?? b.assetId;
          return assetA.localeCompare(assetB);
        }
        if (sortOption === "status") {
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        }
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        if (sortOption === "oldest") {
          return aTime - bTime;
        }
        return bTime - aTime;
      });
      return sorted;
    }

    const activeFiltered = sortOrders(activeOrders.filter(matches));
    const completedFiltered = sortOrders(completedOrders.filter(matches));

    return {
      active: activeFiltered,
      completed: completedFiltered,
    };
  }, [activeOrders, completedOrders, searchTerm, typeFilter, technicianFilter, sortOption, assetMap]);

  const filteredActiveOrders = filterAndSortOrders.active;
  const filteredCompletedOrders = filterAndSortOrders.completed;

  const canReset = filtersActive;

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

      <Card className="relative overflow-hidden border-sky-200/70 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/40 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex rounded-full bg-slate-900 p-2 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-lg">AI maintenance forecast</CardTitle>
              <CardDescription>Anticipates upcoming work orders using maintenance completion history.</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-slate-900 text-white hover:bg-slate-900">AI powered</Badge>
            <Badge variant="outline">
              {maintenanceForecastQuery.data?.source === "azure" ? "Azure ML live" : "Baseline model"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {maintenanceForecastQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : forecastRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No maintenance history yet to generate forecasts.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="w-28">Last done</TableHead>
                      <TableHead className="w-28 text-right">Avg interval</TableHead>
                      <TableHead className="w-28">Next due</TableHead>
                      <TableHead className="w-24">Risk</TableHead>
                      <TableHead className="w-24">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecastRows.map((row) => (
                      <TableRow key={`forecast-${row.assetId}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{row.assetCode}</span>
                            <span className="text-xs text-muted-foreground">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(row.lastCompletedAt)}</TableCell>
                        <TableCell className="text-right">
                          {row.avgIntervalDays == null ? "-" : `${row.avgIntervalDays}d`}
                        </TableCell>
                        <TableCell>{formatDate(row.nextDueAt)}</TableCell>
                        <TableCell>{renderRiskBadge(row.risk)}</TableCell>
                        <TableCell>{renderConfidenceBadge(row.confidence)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full flex-col gap-3 md:flex-row">
          <Input
            className="md:w-72"
            placeholder="Search WO number, asset, technician"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="All maintenance types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All maintenance types</SelectItem>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="All technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technicians</SelectItem>
              {technicianOptions.map((tech) => (
                <SelectItem key={tech} value={tech}>
                  {tech}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="asset">Asset code</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setTypeFilter("all");
              setTechnicianFilter("all");
              setSortOption("newest");
            }}
            disabled={!canReset}
          >
            Reset
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active">Active queue ({filteredActiveOrders.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed & cancelled ({filteredCompletedOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {workOrdersQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : filteredActiveOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active work orders match the current filters.</p>
          ) : (
            <div className="space-y-3">
              {filteredActiveOrders.map((order) => {
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
          ) : filteredCompletedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed records match the current filters.</p>
          ) : (
            <div className="space-y-3">
              {filteredCompletedOrders.map((order) => {
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

interface OrderCardProps {
  order: WorkOrderRecord;
  assetCode: string;
  assetCategory: string | null | undefined;
  canAdvance: boolean;
  nextStatuses: WorkOrderStatus[];
}
function OrderCard({ order, assetCode, assetCategory, canAdvance, nextStatuses }: OrderCardProps) {
  const statusVariant: Record<WorkOrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
    OPEN: "outline",
    SCHEDULED: "secondary",
    IN_PROGRESS: "default",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
  };

  return (
    <Card className="border bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold text-foreground">{order.woNo}</CardTitle>
          <CardDescription>
            {assetCode}
            {assetCategory ? ` - ${assetCategory}` : ""}
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
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant[order.status]}>Status: {STATUS_LABELS[order.status]}</Badge>
          <Badge variant="secondary">Type: {order.type.replace(/_/g, " ")}</Badge>
          {order.technician ? <Badge variant="outline">Tech: {order.technician}</Badge> : null}
        </div>
        <div className="grid gap-1 sm:grid-cols-2">
          <span>Created {formatDate(order.createdAt)}</span>
          {order.scheduledAt ? <span>Scheduled {formatDate(order.scheduledAt)}</span> : null}
          {order.startedAt ? <span>Started {formatDate(order.startedAt)}</span> : null}
          {order.completedAt ? <span>Completed {formatDate(order.completedAt)}</span> : null}
          {order.cost != null ? <span>Cost: {currency.format(Number(order.cost))}</span> : null}
        </div>
        {order.notes ? <p className="text-sm text-muted-foreground">{order.notes}</p> : null}
      </CardContent>
    </Card>
  );
}

function renderRiskBadge(risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN") {
  if (risk === "HIGH") return <Badge variant="destructive">High</Badge>;
  if (risk === "MEDIUM") return <Badge variant="secondary">Medium</Badge>;
  if (risk === "UNKNOWN") return <Badge variant="outline">Unknown</Badge>;
  return <Badge variant="outline">Low</Badge>;
}

function renderConfidenceBadge(confidence: "LOW" | "MEDIUM" | "HIGH") {
  if (confidence === "HIGH") return <Badge variant="secondary">High</Badge>;
  if (confidence === "MEDIUM") return <Badge variant="outline">Medium</Badge>;
  return <Badge variant="outline">Low</Badge>;
}
