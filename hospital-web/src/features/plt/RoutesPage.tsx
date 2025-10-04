import { useMemo, useState } from "react";
import { Clock4, Truck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { usePltDeliveries, type DeliveryRecord } from "@/hooks/usePltData";

import { UpdateDeliveryStatusDialog } from "./components/DeliveryDialogs";

const BOARD_STATUSES = ["DISPATCHED", "IN_TRANSIT", "DELAYED"] as const;

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default function RoutesPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

  const deliveriesQuery = usePltDeliveries();
  const deliveries = deliveriesQuery.data ?? [];

  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortOption, setSortOption] = useState("status");

  if (!isManager) {
    return (
      <Alert className="border-dashed">
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>Only managers and administrators can view the live route board.</AlertDescription>
      </Alert>
    );
  }

  const projectLabel = (delivery: DeliveryRecord) => delivery.project?.code ?? `Project ${delivery.projectId}`;

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    deliveries.forEach((delivery) => set.add(projectLabel(delivery)));
    return Array.from(set).sort();
  }, [deliveries]);

  const filtersActive = searchTerm.trim().length > 0 || projectFilter !== "all" || sortOption !== "status";

  const groups = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const initial = BOARD_STATUSES.reduce<Record<string, DeliveryRecord[]>>((acc, status) => {
      acc[status] = [];
      return acc;
    }, {} as Record<string, DeliveryRecord[]>);

    deliveries.forEach((delivery) => {
      if (!initial[delivery.status]) return;
      const label = projectLabel(delivery);
      const matchesProject = projectFilter === "all" || label === projectFilter;
      const matchesSearch =
        !search ||
        [label, delivery.project?.name, delivery.trackingNo, delivery.lastKnown]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(search));
      if (matchesProject && matchesSearch) {
        initial[delivery.status].push(delivery);
      }
    });

    Object.keys(initial).forEach((status) => {
      initial[status].sort((a, b) => {
        if (sortOption === "eta") {
          const aTime = a.eta ? new Date(a.eta).getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.eta ? new Date(b.eta).getTime() : Number.POSITIVE_INFINITY;
          return aTime - bTime;
        }
        if (sortOption === "project") {
          return projectLabel(a).localeCompare(projectLabel(b));
        }
        if (sortOption === "alerts") {
          return b.alerts.length - a.alerts.length;
        }
        return 0;
      });
    });

    return initial;
  }, [deliveries, projectFilter, projectLabel, searchTerm, sortOption]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Distribution routes</h1>
        <p className="text-muted-foreground max-w-3xl">
          Visualize in-flight routes by status, promote on-time deliveries, and escalate delay immediately.
        </p>
      </header>

      <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-3 lg:flex lg:items-end lg:justify-between lg:space-y-0">
        <div className="flex w-full flex-col gap-3 md:flex-row">
          <Input
            className="md:w-72"
            placeholder="Search project, tracking, or location"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projectOptions.map((project) => (
                <SelectItem key={project} value={project}>
                  {project}
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
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="eta">ETA (soonest)</SelectItem>
              <SelectItem value="project">Project code</SelectItem>
              <SelectItem value="alerts">Alerts (desc)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setProjectFilter("all");
              setSortOption("status");
            }}
            disabled={!filtersActive}
          >
            Reset
          </Button>
        </div>
      </div>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" /> Current routes
          </CardTitle>
          <CardDescription>Drag-and-drop coming soon. For now, monitor progress and update status from this board.</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveriesQuery.isLoading ? (
            <Skeleton className="h-48" />
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active routes yet—log a delivery to populate this board.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {BOARD_STATUSES.map((status) => {
                const items = groups[status];
                return (
                  <div key={status} className="space-y-3 rounded-lg border bg-background/60 p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {statusLabel(status)}
                      </h2>
                      <Badge variant={status === "DELAYED" ? "destructive" : "secondary"}>{items.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No deliveries currently in this state.</p>
                      ) : (
                        items.map((delivery) => <RouteCard key={delivery.id} delivery={delivery} />)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function RouteCard({ delivery }: { delivery: DeliveryRecord }) {
  const lastUpdate = delivery.updates?.[0];
  return (
    <div className="rounded-md border border-border/60 bg-card/80 p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{delivery.project?.code ?? `Project ${delivery.projectId}`}</p>
          <p className="text-xs text-muted-foreground">{delivery.trackingNo || "No tracking"}</p>
        </div>
        <UpdateDeliveryStatusDialog
          delivery={delivery}
          trigger={<Button variant="outline" size="sm">Update</Button>}
        />
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1">
          <Clock4 className="h-3 w-3" /> ETA {delivery.eta ? formatDate(delivery.eta) : "-"}
        </p>
        <p className="flex items-center gap-1">
          <Truck className="h-3 w-3" /> Last known {delivery.lastKnown || "Unknown"}
        </p>
        {lastUpdate ? <p>Last event: {statusLabel(lastUpdate.status)}</p> : <p>No timeline events yet.</p>}
        {delivery.alerts.length ? (
          <p className="text-destructive">{delivery.alerts.length} unresolved alert(s)</p>
        ) : null}
      </div>
    </div>
  );
}
