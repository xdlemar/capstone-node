import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Clock, MapPin, Package, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { usePltDeliveries, usePltProjects, usePltSummary } from "@/hooks/usePltData";

import { CreateDeliveryDialog, UpdateDeliveryStatusDialog } from "./components/DeliveryDialogs";

const statusVariant: Record<string, string> = {
  DRAFT: "secondary",
  DISPATCHED: "outline",
  IN_TRANSIT: "default",
  DELAYED: "destructive",
  DELIVERED: "default",
  CANCELLED: "secondary",
};

function humanStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default function DeliveriesPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

  const summaryQuery = usePltSummary({ enabled: isManager });
  const deliveriesQuery = usePltDeliveries();
  const projectsQuery = usePltProjects();

  if (!isManager) {
    return (
      <Alert className="border-dashed">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>Only managers and administrators can manage logistics deliveries.</AlertDescription>
      </Alert>
    );
  }

  const deliveries = deliveriesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const isLoading = deliveriesQuery.isLoading || projectsQuery.isLoading;

  const summary = summaryQuery.data;

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Project deliveries</h1>
            <p className="text-muted-foreground max-w-3xl">
              Monitor shipment milestones, flag delayed routes, and keep project teams in the loop.
            </p>
          </div>
          {projects.length > 0 ? (
            <CreateDeliveryDialog
              projects={projects}
              trigger={<Button>Create delivery</Button>}
              onCreated={() => deliveriesQuery.refetch()}
            />
          ) : null}
        </div>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" /> Active logistics snapshot
          </CardTitle>
          <CardDescription>Quick glance at project logistics health for Logistics 1.</CardDescription>
        </CardHeader>
        <CardContent>
          {summaryQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile label="Active projects" value={summary.activeProjects} icon={<MapPin className="h-5 w-5" />} />
              <SummaryTile
                label="In transit"
                value={summary.deliveriesInTransit}
                icon={<Clock className="h-5 w-5" />}
              />
              <SummaryTile
                label="Delayed"
                value={summary.delayedDeliveries}
                icon={<AlertCircle className="h-5 w-5" />}
                tone={summary.delayedDeliveries ? "destructive" : "neutral"}
              />
              <SummaryTile
                label="Open alerts"
                value={summary.alertsOpen}
                icon={<ShieldAlert className="h-5 w-5" />}
                tone={summary.alertsOpen ? "destructive" : "neutral"}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No summary data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Live delivery board</CardTitle>
          <CardDescription>Track milestones, ETAs, and unresolved alerts for every active shipment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries have been logged yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Last update</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => {
                    const latestUpdate = delivery.updates?.[0];
                    const updateAgo = latestUpdate
                      ? formatDistanceToNow(new Date(latestUpdate.occurredAt), { addSuffix: true })
                      : "-";
                    return (
                      <TableRow key={delivery.id}>
                        <TableCell className="max-w-[220px]">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {delivery.project?.code ?? `Project ${delivery.projectId}`}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {delivery.project?.name ?? "Unlabelled project"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={(statusVariant[delivery.status] as any) ?? "secondary"}>
                            {humanStatus(delivery.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{delivery.trackingNo || "-"}</span>
                            <span className="text-xs text-muted-foreground">
                              {delivery.lastKnown ? `Last known: ${delivery.lastKnown}` : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{formatDate(delivery.eta)}</span>
                            <span className="text-xs text-muted-foreground">
                              Departed: {formatDate(delivery.departedAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>{latestUpdate ? humanStatus(latestUpdate.status) : "No events yet"}</span>
                            <span className="text-xs text-muted-foreground">{updateAgo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {delivery.alerts.length ? (
                            <Badge variant="destructive">{delivery.alerts.length} open</Badge>
                          ) : (
                            <Badge variant="secondary">Clear</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <UpdateDeliveryStatusDialog
                            delivery={delivery}
                            trigger={<Button size="sm" variant="outline">Update</Button>}
                            onUpdated={() => deliveriesQuery.refetch()}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "neutral" | "destructive";
}) {
  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${
        tone === "destructive" ? "border-destructive/40 bg-destructive/5" : "border-border/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-muted p-2 text-muted-foreground">{icon}</span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}
