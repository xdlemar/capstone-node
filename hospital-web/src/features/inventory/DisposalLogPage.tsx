import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

export type DisposalRequest = {
  id: string;
  batchId: string;
  itemId: string;
  fromLocId: string;
  qty: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string | null;
  requestedBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  disposedAt?: string | null;
  method?: string | null;
  witness?: string | null;
  referenceNo?: string | null;
  itemName?: string | null;
  fromLocName?: string | null;
  createdAt: string;
  updatedAt: string;
};

async function fetchDisposals(status?: string): Promise<DisposalRequest[]> {
  const params: Record<string, string> = {};
  if (status && status !== "all") params.status = status;
  const res = await api.get("/inventory/disposals", { params });
  const rows = (res.data ?? []) as DisposalRequest[];
  return rows.map((row) => ({ ...row, qty: Number(row.qty) }));
}

function renderStatusBadge(status: DisposalRequest["status"]) {
  if (status === "APPROVED") return <Badge variant="secondary">Approved</Badge>;
  if (status === "REJECTED") return <Badge variant="outline">Rejected</Badge>;
  return <Badge variant="destructive">Pending</Badge>;
}

export default function DisposalLogPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const logQuery = useQuery({
    queryKey: ["inventory", "disposals", statusFilter],
    queryFn: () => fetchDisposals(statusFilter),
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => logQuery.data ?? [], [logQuery.data]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Disposal log</h1>
        <p className="text-muted-foreground max-w-3xl">
          Track expired or quarantined inventory awaiting approval, completed write-offs, and rejected requests.
        </p>
      </header>

      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Disposal requests</CardTitle>
            <CardDescription>All requests submitted from the inventory team.</CardDescription>
          </div>
          <div className="w-full max-w-xs">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {logQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading disposal requests...
            </div>
          ) : logQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load disposal requests</AlertTitle>
              <AlertDescription>Try refreshing the page or checking your connection.</AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No disposal requests yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead>Requested by</TableHead>
                    <TableHead>Reviewed by</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="w-40">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{renderStatusBadge(row.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">Batch {row.batchId}</span>
                          <span className="text-xs text-muted-foreground">
                            {row.itemName ?? `Item ${row.itemId}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{row.fromLocName ?? `Location ${row.fromLocId}`}</TableCell>
                      <TableCell className="text-right">{Number(row.qty).toLocaleString()}</TableCell>
                      <TableCell>{row.requestedBy ?? "-"}</TableCell>
                      <TableCell>{row.reviewedBy ?? "-"}</TableCell>
                      <TableCell>{row.referenceNo ?? "-"}</TableCell>
                      <TableCell>{new Date(row.updatedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
