import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BellRing, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePltAlerts } from "@/hooks/usePltData";
import { api } from "@/lib/api";

export default function LogisticsAlertsPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");
  const qc = useQueryClient();
  const { toast } = useToast();

  const alertsQuery = usePltAlerts();

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/plt/alerts/${id}/resolve`);
    },
    onSuccess: () => {
      toast({ title: "Alert resolved" });
      qc.invalidateQueries({ queryKey: ["plt", "alerts"] });
      qc.invalidateQueries({ queryKey: ["plt", "deliveries"] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Failed to resolve alert",
        description: err?.response?.data?.error ?? err.message ?? "Unexpected error",
      });
    },
  });

  if (!isManager) {
    return (
      <Alert className="border-dashed">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>Only managers and administrators can close logistics alerts.</AlertDescription>
      </Alert>
    );
  }

  const alerts = alertsQuery.data ?? [];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Logistics alerts</h1>
        <p className="text-muted-foreground max-w-3xl">
          Stay ahead of delayed deliveries, expiring permits, or route disruptions.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" /> Alert feed
          </CardTitle>
          <CardDescription>Resolve alerts once contingency actions are in motion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertsQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : alerts.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-5 w-5" />
              <AlertTitle>No alerts</AlertTitle>
              <AlertDescription>Everything looks healthy. New alerts will appear automatically.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-md border border-border/60 bg-card/80 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{alert.type.replace(/_/g, " ")}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Triggered {new Date(alert.triggeredAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-medium text-sm text-foreground">{alert.message}</p>
                      {alert.delivery ? (
                        <p className="text-xs text-muted-foreground">
                          Delivery {alert.delivery.trackingNo ?? alert.delivery.id} • Status {alert.delivery.status}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={resolveMutation.isPending}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
