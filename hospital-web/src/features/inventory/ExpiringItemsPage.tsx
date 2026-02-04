import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useInventoryExpiringBatches } from "@/hooks/useInventoryExpiringBatches";
import { useInventoryFlaggedBatches } from "@/hooks/useInventoryFlaggedBatches";
import { useInventoryLookups } from "@/hooks/useInventoryLookups";
import { api } from "@/lib/api";

export default function ExpiringItemsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: lookups } = useInventoryLookups();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expiryWindowDays, setExpiryWindowDays] = useState<string>("30");

  const expiringQuery = useInventoryExpiringBatches({ windowDays: Number(expiryWindowDays) || 30, take: 200 });
  const flaggedQuery = useInventoryFlaggedBatches(["EXPIRED", "QUARANTINED"]);

  const [disposalOpen, setDisposalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchName, setSelectedBatchName] = useState<string | null>(null);
  const [disposalQty, setDisposalQty] = useState<string>("");
  const [disposalLocation, setDisposalLocation] = useState<string>("");
  const [disposalReason, setDisposalReason] = useState<string>("");

  const roleSet = new Set(user?.roles ?? []);
  const canRequestDisposal = roleSet.has("STAFF") && !roleSet.has("MANAGER") && !roleSet.has("ADMIN");

  const daysUntil = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    const diffMs = parsed.getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString();
  };

  const mergedRows = useMemo(() => {
    const map = new Map<string, any>();
    (expiringQuery.data ?? []).forEach((batch) => {
      map.set(batch.id, { ...batch, source: "expiring" });
    });
    (flaggedQuery.data ?? []).forEach((batch) => {
      map.set(batch.id, { ...batch, source: "flagged" });
    });

    let rows = Array.from(map.values());
    if (typeFilter !== "all") {
      rows = rows.filter((row) => (row.item?.type ?? "supply") === typeFilter);
    }

    const statusOrder = (row: any) => {
      if (row.status === "EXPIRED") return 0;
      if (row.status === "QUARANTINED") return 1;
      return 2;
    };

    rows.sort((a, b) => {
      const statusDelta = statusOrder(a) - statusOrder(b);
      if (statusDelta !== 0) return statusDelta;
      const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY;
      const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY;
      return aExpiry - bExpiry;
    });

    return rows;
  }, [expiringQuery.data, flaggedQuery.data, typeFilter]);

  const disposalMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBatchId) throw new Error("No batch selected");
      if (!disposalLocation) throw new Error("Location is required");
      const qtyNumber = Number(disposalQty);
      if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
        throw new Error("Quantity must be positive");
      }
      const payload = {
        batchId: selectedBatchId,
        fromLocId: disposalLocation,
        qty: qtyNumber,
        reason: disposalReason || undefined,
      };
      const res = await api.post("/inventory/disposals", payload);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: "Disposal requested", description: "Manager approval is now required." });
      setDisposalOpen(false);
      setSelectedBatchId(null);
      setSelectedBatchName(null);
      setDisposalQty("");
      setDisposalLocation("");
      setDisposalReason("");
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err?.message || "Failed to request disposal";
      toast({ variant: "destructive", title: "Request failed", description: message });
    },
  });

  const openDisposalDialog = (batch: { id: string; item?: { name?: string | null } | null; qtyOnHand?: number }) => {
    setSelectedBatchId(batch.id);
    setSelectedBatchName(batch.item?.name ?? "Unknown item");
    setDisposalQty(batch.qtyOnHand != null ? String(batch.qtyOnHand) : "");
    setDisposalOpen(true);
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Expiring items</h1>
        <p className="text-muted-foreground max-w-3xl">
          Batch-level view of expiring, expired, and quarantined inventory. Use this page for disposal requests.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Batch watchlist</CardTitle>
            <CardDescription>Includes upcoming expiries and flagged batches.</CardDescription>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All items</SelectItem>
                <SelectItem value="medicine">Medicine</SelectItem>
                <SelectItem value="supply">Supply</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={expiryWindowDays} onValueChange={setExpiryWindowDays}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Expires within" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Expires in 7 days</SelectItem>
                <SelectItem value="14">Expires in 14 days</SelectItem>
                <SelectItem value="30">Expires in 30 days</SelectItem>
                <SelectItem value="60">Expires in 60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {mergedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expiring or flagged batches in this window.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-28">Lot</TableHead>
                    <TableHead className="w-32">Expires</TableHead>
                    <TableHead className="w-24 text-right">Days left</TableHead>
                    <TableHead className="w-28 text-right">On-hand</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    {canRequestDisposal ? <TableHead className="w-28">Action</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedRows.map((batch) => {
                    const remaining = daysUntil(batch.expiryDate);
                    const statusVariant =
                      batch.status === "EXPIRED"
                        ? "destructive"
                        : batch.status === "QUARANTINED"
                          ? "secondary"
                          : remaining != null && remaining <= 7
                            ? "destructive"
                            : remaining != null && remaining <= 14
                              ? "secondary"
                              : "outline";

                    const statusLabel =
                      batch.status === "EXPIRED"
                        ? "Expired"
                        : batch.status === "QUARANTINED"
                          ? "Quarantined"
                          : remaining == null
                            ? "Unknown"
                            : remaining <= 0
                              ? "Expired"
                              : remaining <= 7
                                ? "Critical"
                                : remaining <= 14
                                  ? "Soon"
                                  : "Upcoming";

                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{batch.item?.name ?? "Unknown item"}</span>
                            <span className="text-xs text-muted-foreground">{batch.item?.sku ?? "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{batch.lotNo ?? "-"}</TableCell>
                        <TableCell>{formatDate(batch.expiryDate)}</TableCell>
                        <TableCell className="text-right">{remaining ?? "-"}</TableCell>
                        <TableCell className="text-right">{Number(batch.qtyOnHand).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant as "outline" | "secondary" | "destructive"}>{statusLabel}</Badge>
                        </TableCell>
                        {canRequestDisposal ? (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDisposalDialog(batch)}
                              disabled={(lookups?.locations.length ?? 0) === 0 || Number(batch.qtyOnHand) <= 0}
                            >
                              Request disposal
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={disposalOpen} onOpenChange={setDisposalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Disposal request</DialogTitle>
            <DialogDescription>
              Submit expired or quarantined stock for manager approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Item:</span> {selectedBatchName ?? "-"}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From location</label>
              <Select value={disposalLocation} onValueChange={setDisposalLocation}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {lookups?.locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.kind})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min={1}
                value={disposalQty}
                onChange={(event) => setDisposalQty(event.target.value)}
                placeholder="Quantity to dispose"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={disposalReason}
                onChange={(event) => setDisposalReason(event.target.value)}
                placeholder="Expired or damaged stock"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisposalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => disposalMutation.mutate()} disabled={disposalMutation.isPending}>
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
