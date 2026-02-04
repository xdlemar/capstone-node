import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

import type { DisposalRequest } from "@/features/inventory/DisposalLogPage";

async function fetchPendingDisposals(): Promise<DisposalRequest[]> {
  const res = await api.get("/inventory/disposals", { params: { status: "PENDING" } });
  const rows = (res.data ?? []) as DisposalRequest[];
  return rows.map((row) => ({ ...row, qty: Number(row.qty) }));
}

export default function DisposalApprovalsPage() {
  const { toast } = useToast();
  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DisposalRequest | null>(null);
  const [method, setMethod] = useState<string>("");
  const [witness, setWitness] = useState<string>("");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [disposedAt, setDisposedAt] = useState<string>("");

  const pendingQuery = useQuery({
    queryKey: ["inventory", "disposals", "pending"],
    queryFn: fetchPendingDisposals,
    refetchInterval: 60_000,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) throw new Error("No request selected");
      if (!method || !referenceNo) throw new Error("Method and reference are required");
      const payload = {
        method,
        witness: witness || undefined,
        referenceNo,
        disposedAt: disposedAt || undefined,
      };
      const res = await api.post(`/inventory/disposals/${selectedRequest.id}/approve`, payload);
      return res.data as DisposalRequest;
    },
    onSuccess: (data) => {
      toast({ title: "Disposal approved", description: `Request ${data.id} approved.` });
      setApproveOpen(false);
      setSelectedRequest(null);
      setMethod("");
      setWitness("");
      setReferenceNo("");
      setDisposedAt("");
      pendingQuery.refetch();
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err?.message || "Failed to approve disposal";
      toast({ variant: "destructive", title: "Approval failed", description: message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.post(`/inventory/disposals/${id}/reject`, { reason });
      return res.data as DisposalRequest;
    },
    onSuccess: (data) => {
      toast({ title: "Disposal rejected", description: `Request ${data.id} rejected.` });
      pendingQuery.refetch();
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err?.message || "Failed to reject disposal";
      toast({ variant: "destructive", title: "Rejection failed", description: message });
    },
  });

  const rows = useMemo(() => pendingQuery.data ?? [], [pendingQuery.data]);

  const openApproveDialog = (row: DisposalRequest) => {
    setSelectedRequest(row);
    setMethod("");
    setWitness("");
    setReferenceNo("");
    setDisposedAt("");
    setApproveOpen(true);
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Disposal approvals</h1>
        <p className="text-muted-foreground max-w-3xl">
          Review and approve disposal requests submitted for expired or quarantined stock. Approvals write off inventory and
          record the disposal method.
        </p>
      </header>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Pending disposal requests</CardTitle>
          <CardDescription>Manager approval required before write-offs are posted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pending requests...
            </div>
          ) : pendingQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load disposal requests</AlertTitle>
              <AlertDescription>Try refreshing the page or checking your connection.</AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No disposal requests waiting for approval.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead>Requested by</TableHead>
                    <TableHead className="w-40">Created</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant="destructive">Pending</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">Batch {row.batchId}</span>
                          <span className="text-xs text-muted-foreground">
                            {row.itemName ?? `Item ${row.itemId}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{Number(row.qty).toLocaleString()}</TableCell>
                      <TableCell>{row.requestedBy ?? "-"}</TableCell>
                      <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => openApproveDialog(row)}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const reason = window.prompt("Optional rejection reason");
                              rejectMutation.mutate({ id: row.id, reason: reason?.trim() || undefined });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve disposal</DialogTitle>
            <DialogDescription>Provide disposal details to complete the write-off.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Request:</span> {selectedRequest?.id ?? "-"}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Method</label>
              <Input value={method} onChange={(event) => setMethod(event.target.value)} placeholder="Incineration" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference number</label>
              <Input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} placeholder="DISP-0001" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Witness (optional)</label>
              <Input value={witness} onChange={(event) => setWitness(event.target.value)} placeholder="Officer name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Disposed at (optional)</label>
              <Input type="datetime-local" value={disposedAt} onChange={(event) => setDisposedAt(event.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve disposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
