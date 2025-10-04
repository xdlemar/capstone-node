import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAlmsAlerts } from "@/hooks/useAlmsData";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function formatDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dateFormatter.format(dt);
}

export default function AlertsPage() {
  const [showResolved, setShowResolved] = useState(false);
  const alertsQuery = useAlmsAlerts(!showResolved);
  const { toast } = useToast();

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/alms/alerts/${id}/resolve`);
    },
    onSuccess: () => {
      toast({ title: "Alert resolved" });
      alertsQuery.refetch();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to resolve", description: err?.response?.data?.error ?? err.message });
    },
  });

  const alerts = alertsQuery.data ?? [];
  const visibleAlerts = alerts.filter((alert) => (showResolved ? Boolean(alert.resolvedAt) : !alert.resolvedAt));

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Maintenance alerts</h1>
            <p className="text-muted-foreground max-w-3xl">
              Overdue maintenance, warranty expirations, and inspection reminders appear here. Resolve alerts after taking action to keep the signal clean.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowResolved((prev) => !prev)}>
            {showResolved ? "Show unresolved" : "Show resolved"}
          </Button>
        </div>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{showResolved ? "Resolved alerts" : "Open alerts"}</CardTitle>
          <CardDescription>
            {showResolved
              ? "Recently closed issues remain visible here for auditing."
              : "Review and resolve outstanding maintenance alerts."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Triggered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-24 w-full" />
                  </TableCell>
                </TableRow>
              ) : visibleAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    {showResolved ? "No resolved alerts in the log." : "No outstanding alerts. Great job!"}
                  </TableCell>
                </TableRow>
              ) : (
                visibleAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{alert.type.replace(/_/g, " ")}</span>
                        <span className="text-sm text-muted-foreground">{alert.message}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{alert.asset.assetCode}</span>
                        <span className="text-xs text-muted-foreground">Status: {alert.asset.status.replace(/_/g, " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(alert.triggeredAt)}</TableCell>
                    <TableCell>
                      {alert.resolvedAt ? (
                        <Badge variant="secondary">Resolved {formatDate(alert.resolvedAt)}</Badge>
                      ) : (
                        <Badge variant="destructive">Unresolved</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!alert.resolvedAt && !showResolved ? (
                        <Button
                          size="sm"
                          onClick={() => resolveMutation.mutate(alert.id)}
                          disabled={resolveMutation.isLoading}
                        >
                          {resolveMutation.isLoading ? "Resolving..." : "Resolve"}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
