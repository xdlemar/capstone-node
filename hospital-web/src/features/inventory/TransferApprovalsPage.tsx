import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type PendingTransfer = {
  id: string;
  transferNo: string;
  status: string;
  fromLocId: string;
  toLocId: string;
  fromLocName?: string | null;
  toLocName?: string | null;
  requestedBy?: string | null;
  createdAt: string;
  lines: Array<{ id: string; itemId: string; qty: number; notes?: string | null }>;
};

async function fetchPendingTransfers(): Promise<PendingTransfer[]> {
  const res = await api.get("/inventory/transfers", { params: { status: "PENDING" } });
  const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
  return rows as PendingTransfer[];
}

export default function TransferApprovalsPage() {
  const { toast } = useToast();

  const pendingQuery = useQuery({
    queryKey: ["inventory", "transfers", "pending"],
    queryFn: fetchPendingTransfers,
    refetchInterval: 60_000,
  });

  const approveMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await api.post(`/inventory/transfers/${transferId}/approve`);
      return res.data as PendingTransfer;
    },
    onSuccess: (data) => {
      toast({ title: "Transfer approved", description: `${data.transferNo} released.` });
      pendingQuery.refetch();
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err.message || "Failed to approve transfer";
      toast({ variant: "destructive", title: "Approval failed", description: message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const payload = reason ? { reason } : undefined;
      const res = await api.post(`/inventory/transfers/${id}/reject`, payload);
      return res.data as PendingTransfer;
    },
    onSuccess: (data) => {
      toast({ title: "Transfer rejected", description: `${data.transferNo} marked as rejected.` });
      pendingQuery.refetch();
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err.message || "Failed to reject transfer";
      toast({ variant: "destructive", title: "Rejection failed", description: message });
    },
  });

  const rows = pendingQuery.data ?? [];
  const isLoading = pendingQuery.isLoading;
  const isError = pendingQuery.isError;
  const isBusy = approveMutation.isPending || rejectMutation.isPending;
  const approvingId = approveMutation.variables;
  const rejectingId = (rejectMutation.variables as { id: string } | undefined)?.id;

  const handleReject = (id: string) => {
    const reason = window.prompt("Optional rejection reason");
    rejectMutation.mutate({ id, reason: reason?.trim() || undefined });
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Transfer approvals</h1>
        <p className="text-muted-foreground max-w-3xl">
          Review and action pending inter-location transfers submitted by staff. Approvals execute FEFO allocations and
          post the related stock moves automatically.
        </p>
      </header>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Pending transfers</CardTitle>
          <CardDescription>Approve or reject staff-submitted transfers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pending transfers...
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load transfers</AlertTitle>
              <AlertDescription>Try refreshing the page or checking your connection.</AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transfers waiting for approval.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-md border border-border/60 bg-background p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{row.transferNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {(row.fromLocName ?? `Location ${row.fromLocId}`)} to {(row.toLocName ?? `Location ${row.toLocId}`)} · {row.lines.length} line(s)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested by {row.requestedBy ?? "Unknown"} · {new Date(row.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveMutation.mutate(row.id)} disabled={isBusy}>
                        {approveMutation.isPending && approvingId === row.id && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleReject(row.id)} disabled={isBusy}>
                        {rejectMutation.isPending && rejectingId === row.id && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Reject
                      </Button>
                    </div>
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
