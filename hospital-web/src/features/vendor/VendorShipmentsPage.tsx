import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Truck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVendorShipments, type VendorShipment } from "@/hooks/useVendorShipments";
import { api } from "@/lib/api";
import { DELIVERY_TRANSITIONS } from "@/hooks/usePltData";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function statusVariant(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "IN_TRANSIT" || normalized === "DISPATCHED") return "default";
  if (normalized === "DELAYED") return "destructive";
  if (normalized === "DELIVERED") return "secondary";
  if (normalized === "CANCELLED") return "destructive";
  return "outline";
}

function toInputValue(value?: string | null) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 16);
}

export default function VendorShipmentsPage() {
  const shipmentsQuery = useVendorShipments();
  const [sortKey, setSortKey] = useState("etaAsc");
  const shipments = shipmentsQuery.data ?? [];

  const activeCount = useMemo(
    () => shipments.filter((shipment) => shipment.status !== "DELIVERED" && shipment.status !== "CANCELLED").length,
    [shipments]
  );

  const sortedShipments = useMemo(() => {
    const rows = [...shipments];
    const byEta = (a: VendorShipment, b: VendorShipment) => {
      const aTime = a.eta ? new Date(a.eta).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.eta ? new Date(b.eta).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    };
    if (sortKey === "etaAsc") return rows.sort(byEta);
    if (sortKey === "etaDesc") return rows.sort((a, b) => byEta(b, a));
    if (sortKey === "status") {
      return rows.sort((a, b) => a.status.localeCompare(b.status));
    }
    return rows;
  }, [shipments, sortKey]);

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Shipment updates</h1>
            <p className="text-muted-foreground max-w-3xl">
              Share tracking numbers, ETAs, and status updates so the hospital can plan receiving.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>{activeCount} active shipment(s)</span>
          </div>
        </div>
      </header>

      {shipmentsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>We couldn&apos;t load shipments right now. Please try again.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" /> Shipment board
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardDescription>Only shipments tied to your vendor account are shown here.</CardDescription>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort by</span>
              <Select value={sortKey} onValueChange={setSortKey}>
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="etaAsc">ETA (soonest)</SelectItem>
                  <SelectItem value="etaDesc">ETA (latest)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {shipmentsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading shipments...</div>
          ) : sortedShipments.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Last known</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedShipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">{shipment.trackingNo || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(shipment.status)}>{shipment.status}</Badge>
                    </TableCell>
                    <TableCell>{shipment.eta ? dateFormatter.format(new Date(shipment.eta)) : "-"}</TableCell>
                    <TableCell>{shipment.lastKnown || "-"}</TableCell>
                    <TableCell className="text-right">
                      <ShipmentUpdateDialog shipment={shipment} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-muted-foreground">No shipments assigned yet.</div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ShipmentUpdateDialog({ shipment }: { shipment: VendorShipment }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("NO_CHANGE");
  const [trackingNo, setTrackingNo] = useState(shipment.trackingNo ?? "");
  const [eta, setEta] = useState(toInputValue(shipment.eta));
  const [lastKnown, setLastKnown] = useState(shipment.lastKnown ?? "");
  const [message, setMessage] = useState("");

  const isLocked = shipment.status === "DELIVERED" || shipment.status === "CANCELLED";
  const allowedStatuses = DELIVERY_TRANSITIONS[shipment.status] ?? [];
  const statusOptions = ["NO_CHANGE", ...allowedStatuses];

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      if (status !== "NO_CHANGE") payload.status = status;
      if (trackingNo !== shipment.trackingNo) payload.trackingNo = trackingNo;
      if (eta !== toInputValue(shipment.eta)) {
        payload.eta = eta ? new Date(eta).toISOString() : null;
      }
      if (lastKnown !== (shipment.lastKnown ?? "")) payload.lastKnown = lastKnown || null;
      if (message.trim()) payload.message = message.trim();

      await api.patch(`/plt/vendor/shipments/${shipment.id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor", "shipments"] });
      setOpen(false);
    },
  });

  const hasChanges =
    status !== "NO_CHANGE" ||
    trackingNo !== (shipment.trackingNo ?? "") ||
    eta !== toInputValue(shipment.eta) ||
    lastKnown !== (shipment.lastKnown ?? "") ||
    message.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isLocked}>
          {isLocked ? "Locked" : "Update"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update shipment</DialogTitle>
          <DialogDescription>{shipment.trackingNo || `Shipment ${shipment.id}`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`status-${shipment.id}`}>
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id={`status-${shipment.id}`}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO_CHANGE">No change</SelectItem>
                {statusOptions
                  .filter((option) => option !== "NO_CHANGE")
                  .map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`tracking-${shipment.id}`}>
              Tracking number
            </label>
            <Input
              id={`tracking-${shipment.id}`}
              value={trackingNo}
              onChange={(event) => setTrackingNo(event.target.value)}
              placeholder="Waybill / reference"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`eta-${shipment.id}`}>
              ETA
            </label>
            <Input
              id={`eta-${shipment.id}`}
              type="datetime-local"
              value={eta}
              onChange={(event) => setEta(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`last-known-${shipment.id}`}>
              Last known location
            </label>
            <Input
              id={`last-known-${shipment.id}`}
              value={lastKnown}
              onChange={(event) => setLastKnown(event.target.value)}
              placeholder="Facility, hub, or city"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`message-${shipment.id}`}>
              Notes
            </label>
            <Input
              id={`message-${shipment.id}`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add context (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!hasChanges || mutation.isPending || isLocked}>
            {mutation.isPending ? "Updating..." : "Save update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
