import { Truck, AlertTriangle, Clock4 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { usePltDeliveries, type DeliveryRecord } from "@/hooks/usePltData";

import { UpdateDeliveryStatusDialog } from "./components/DeliveryDialogs";

const BOARD_STATUSES = ["DISPATCHED", "IN_TRANSIT", "DELAYED"] as const;

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default function RoutesPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

  const deliveriesQuery = usePltDeliveries();

  if (!isManager) {
    return (
      <Alert className="border-dashed">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>Only managers and administrators can view the live route board.</AlertDescription>
      </Alert>
    );
  }

  const deliveries = deliveriesQuery.data ?? [];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Distribution routes</h1>
        <p className="text-muted-foreground max-w-3xl">
          Visualize in-flight routes by status, promote on-time deliveries, and escalate delays immediately.
        </p>
      </header>

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
                const items = deliveries.filter((delivery) => delivery.status === status);
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

function RouteCard({ delivery }: { delivery: ReturnType<typeof usePltDeliveries>["data"] extends Array<infer T> ? T : never }) {
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
          trigger={<Badge variant="outline" className="cursor-pointer">Update</Badge>}
        />
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1">
          <Clock4 className="h-3 w-3" /> ETA {delivery.eta ? new Date(delivery.eta).toLocaleString() : "-"}
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


