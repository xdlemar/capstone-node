import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BellRing, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"open" | "all">("open");
  const [sortOption, setSortOption] = useState("newest");

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

  const distinctTypes = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach((alert) => set.add(alert.type));
    return Array.from(set).sort();
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered = alerts.filter((alert) => {
      const matchesType = typeFilter === "all" || alert.type === typeFilter;
      const matchesStatus = statusFilter === "all" || !alert.resolvedAt;
      const label = alert.delivery?.trackingNo ?? alert.delivery?.id ?? "";
      const matchesSearch =
        !search ||
        [alert.message, alert.type, label]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(search));
      return matchesType && matchesStatus && matchesSearch;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortOption === "oldest") {
        return new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime();
      }
      if (sortOption === "type") {
        return a.type.localeCompare(b.type);
      }
      if (sortOption === "delivery") {
        const aLabel = a.delivery?.trackingNo ?? a.delivery?.id ?? "";
        const bLabel = b.delivery?.trackingNo ?? b.delivery?.id ?? "";
        return aLabel.localeCompare(bLabel);
      }
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    });

    return sorted;
  }, [alerts, searchTerm, typeFilter, statusFilter, sortOption]);

  const filtersActive =
    searchTerm.trim().length > 0 || typeFilter !== "all" || statusFilter !== "open" || sortOption !== "newest";

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Logistics alerts</h1>
        <p className="text-muted-foreground max-w-3xl">
          Stay ahead of delayed deliveries, expiring permits, or route disruptions.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex w-full flex-col gap-3 md:flex-row">
          <Input
            className="md:w-72"
            placeholder="Search message, type, or tracking"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="All alert types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All alert types</SelectItem>
              {distinctTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Unresolved" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Unresolved only</SelectItem>
              <SelectItem value="all">All alerts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="type">Alert type</SelectItem>
              <SelectItem value="delivery">Delivery code</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setTypeFilter("all");
              setStatusFilter("open");
              setSortOption("newest");
            }}
            disabled={!filtersActive}
          >
            Reset
          </Button>
        </div>
      </div>

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
          ) : filteredAlerts.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-5 w-5" />
              <AlertTitle>No alerts</AlertTitle>
              <AlertDescription>No alerts match the current filters.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
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
