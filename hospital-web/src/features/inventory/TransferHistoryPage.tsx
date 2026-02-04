import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryLookups } from "@/hooks/useInventoryLookups";
import { api } from "@/lib/api";

type TransferRow = {
  id: string;
  transferNo: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  fromLocId: string;
  toLocId: string;
  fromLocName?: string | null;
  toLocName?: string | null;
  requestedBy?: string | null;
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  lines: Array<{ id: string; itemId: string; qty: number; notes?: string | null }>;
};

async function fetchTransfers(status?: string): Promise<TransferRow[]> {
  const params = status ? { status } : undefined;
  const res = await api.get("/inventory/transfers", { params });
  const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
  return rows as TransferRow[];
}

export default function TransferHistoryPage() {
  const lookups = useInventoryLookups();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRow | null>(null);

  const statusParam = statusFilter === "ALL" ? undefined : statusFilter;
  const transfersQuery = useQuery({
    queryKey: ["inventory", "transfers", "history", statusFilter],
    queryFn: () => fetchTransfers(statusParam),
    refetchInterval: 60_000,
  });

  const itemMap = useMemo(() => {
    const map = new Map<string, { name: string; strength?: string | null; type?: string | null }>();
    lookups.data?.items.forEach((item) => {
      map.set(item.id, { name: item.name, strength: item.strength, type: item.type });
    });
    return map;
  }, [lookups.data?.items]);

  const filteredRows = useMemo(() => {
    const rows = transfersQuery.data ?? [];
    const searchKey = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter !== "all") {
        const hasType = row.lines.some(
          (line) => (itemMap.get(line.itemId)?.type ?? "supply") === typeFilter
        );
        if (!hasType) return false;
      }
      if (searchKey) {
        return row.transferNo.toLowerCase().includes(searchKey);
      }
      return true;
    });
  }, [transfersQuery.data, typeFilter, search, itemMap]);

  const isLoading = transfersQuery.isLoading;
  const isError = transfersQuery.isError;

  const renderLineName = (line: TransferRow["lines"][number]) => {
    const meta = itemMap.get(line.itemId);
    const strength = meta?.strength ? ` ${meta.strength}` : "";
    return `${meta?.name ?? `Item ${line.itemId}`}${strength}`;
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Transfer history</h1>
        <p className="text-muted-foreground max-w-3xl">
          Review submitted transfers across locations. Staff only see their own requests; managers see the full queue.
        </p>
      </header>

      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>All transfers</CardTitle>
            <CardDescription>Filter by status, type, or transfer number.</CardDescription>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Search transfer no."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All items</SelectItem>
                <SelectItem value="medicine">Medicine</SelectItem>
                <SelectItem value="supply">Supply</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading transfers...
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load transfers</AlertTitle>
              <AlertDescription>Try refreshing the page or checking your connection.</AlertDescription>
            </Alert>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transfers found.</p>
          ) : (
            <div className="space-y-3">
              {filteredRows.map((row) => (
                <div key={row.id} className="rounded-md border border-border/60 bg-background p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{row.transferNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {(row.fromLocName ?? `Location ${row.fromLocId}`)} to{" "}
                        {(row.toLocName ?? `Location ${row.toLocId}`)} - {row.lines.length} line(s)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested by {row.requestedBy ?? "Unknown"} - {new Date(row.createdAt).toLocaleString()}
                      </p>
                      {row.status === "REJECTED" && row.rejectionReason ? (
                        <p className="text-xs text-destructive">Reason: {row.rejectionReason}</p>
                      ) : null}
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {row.lines.map((line) => (
                          <div key={line.id}>
                            {renderLineName(line)} - Qty {line.qty}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          row.status === "APPROVED"
                            ? "secondary"
                            : row.status === "REJECTED"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {row.status}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => setSelectedTransfer(row)}>
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTransfer} onOpenChange={(open) => !open && setSelectedTransfer(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer details</DialogTitle>
            <DialogDescription>Full history of the selected transfer.</DialogDescription>
          </DialogHeader>
          {selectedTransfer ? (
            <div className="space-y-4">
              <div className="rounded-md border border-border/60 p-3">
                <div className="text-sm text-muted-foreground">Transfer no.</div>
                <div className="text-lg font-semibold">{selectedTransfer.transferNo}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {(selectedTransfer.fromLocName ?? `Location ${selectedTransfer.fromLocId}`)} to{" "}
                  {(selectedTransfer.toLocName ?? `Location ${selectedTransfer.toLocId}`)}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Requested by</div>
                  <div className="text-sm font-medium">{selectedTransfer.requestedBy ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(selectedTransfer.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Reviewed by</div>
                  <div className="text-sm font-medium">{selectedTransfer.reviewedBy ?? "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedTransfer.reviewedAt ? new Date(selectedTransfer.reviewedAt).toLocaleString() : "-"}
                  </div>
                </div>
              </div>
              {selectedTransfer.status === "REJECTED" && selectedTransfer.rejectionReason ? (
                <Alert variant="destructive">
                  <AlertTitle>Rejected</AlertTitle>
                  <AlertDescription>{selectedTransfer.rejectionReason}</AlertDescription>
                </Alert>
              ) : null}
              <div className="rounded-md border border-border/60 p-3">
                <div className="text-sm font-semibold">Line items</div>
                <div className="mt-2 space-y-2 text-sm">
                  {selectedTransfer.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between">
                      <span>{renderLineName(line)}</span>
                      <span className="text-muted-foreground">Qty {line.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTransfer(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}




