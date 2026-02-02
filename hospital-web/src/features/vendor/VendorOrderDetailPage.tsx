import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useVendorOrder } from "@/hooks/useVendorOrders";
import { useVendorShipments } from "@/hooks/useVendorShipments";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const currencyFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function statusVariant(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "OPEN") return "default";
  if (normalized === "PARTIAL") return "secondary";
  if (normalized === "CANCELLED") return "destructive";
  return "outline";
}

export default function VendorOrderDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orderQuery = useVendorOrder(id);
  const shipmentsQuery = useVendorShipments({ poId: id });
  const isApproved = !!orderQuery.data?.vendorAcknowledgedAt;
  const hasShipment = (shipmentsQuery.data?.length ?? 0) > 0;
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [trackingNo, setTrackingNo] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [eta, setEta] = useState("");
  const [departedAt, setDepartedAt] = useState("");
  const [lastKnown, setLastKnown] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!scheduleOpen) {
      setTrackingNo("");
      setEta("");
      setDepartedAt("");
      setLastKnown("");
      setNotes("");
      setTrackingLoading(false);
      return;
    }

    let cancelled = false;

    const hydrateTracking = async () => {
      if (trackingNo) return;
      setTrackingLoading(true);
      try {
        const { data } = await api.get<{ trackingNo?: string }>(
          "/plt/vendor/shipments/next-tracking"
        );
        if (!cancelled && data?.trackingNo) {
          setTrackingNo(data.trackingNo);
        }
      } catch (err: any) {
        if (!cancelled) {
          const message = err?.response?.data?.error || err.message || "Failed to generate tracking number";
          toast({ title: "Tracking error", description: message, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setTrackingLoading(false);
      }
    };

    hydrateTracking();

    return () => {
      cancelled = true;
    };
  }, [scheduleOpen, trackingNo, toast]);

  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.patch(`/procurement/vendor/pos/${orderId}/ack`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor", "orders"] });
      qc.invalidateQueries({ queryKey: ["vendor", "orders", id] });
      toast({ title: "Order approved", description: "You can now schedule shipment details." });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err.message || "Failed to approve order";
      toast({ title: "Approval failed", description: message, variant: "destructive" });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!orderQuery.data) return;
      const payload: Record<string, unknown> = {
        poId: orderQuery.data.id,
        trackingNo: trackingNo || undefined,
        lastKnown: lastKnown || undefined,
        notes: notes || undefined,
        status: "DISPATCHED",
      };
      if (eta) payload.eta = new Date(eta).toISOString();
      if (departedAt) payload.departedAt = new Date(departedAt).toISOString();
      await api.post("/plt/vendor/shipments", payload);
    },
    onSuccess: () => {
      setScheduleOpen(false);
      qc.invalidateQueries({ queryKey: ["vendor", "shipments"] });
      qc.invalidateQueries({ queryKey: ["vendor", "shipments", { poId: id }] });
      toast({ title: "Shipment scheduled", description: "Tracking details have been shared with the hospital." });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err.message || "Failed to schedule shipment";
      toast({ title: "Schedule failed", description: message, variant: "destructive" });
    },
  });

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Order details</h1>
          <p className="text-muted-foreground max-w-3xl">
            Review the purchase order line items and confirm your fulfillment plan before shipping.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/vendor/orders">Back to orders</Link>
        </Button>
      </header>

      {orderQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>We couldn&apos;t load this order. Please try again.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
          <CardDescription>Purchase order status and vendor details.</CardDescription>
        </CardHeader>
        <CardContent>
          {orderQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading order...</div>
          ) : orderQuery.data ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">PO Number</div>
                <div className="text-lg font-semibold">{orderQuery.data.poNo}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Status</div>
                <Badge className="mt-1 w-fit" variant={statusVariant(orderQuery.data.status)}>
                  {orderQuery.data.status}
                </Badge>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Ordered</div>
                <div className="text-lg font-semibold">
                  {dateFormatter.format(new Date(orderQuery.data.orderedAt))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Vendor</div>
                <div className="text-lg font-semibold">{orderQuery.data.vendor.name}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Vendor approval</div>
                <div className="text-lg font-semibold">
                  {orderQuery.data.vendorAcknowledgedAt
                    ? dateFormatter.format(new Date(orderQuery.data.vendorAcknowledgedAt))
                    : "Pending"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Line items</div>
                <div className="text-lg font-semibold">{orderQuery.data.lines.length}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Total qty</div>
                <div className="text-lg font-semibold">
                  {orderQuery.data.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Order not found.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor actions</CardTitle>
          <CardDescription>Approve the order and schedule shipment details.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {orderQuery.data ? (
            <>
              {hasShipment ? (
                <Badge variant="secondary">{isApproved ? "Shipment scheduled" : "Shipment detected"}</Badge>
              ) : null}
              <Button
                variant="secondary"
                disabled={isApproved || approveMutation.isPending}
                onClick={() => approveMutation.mutate(orderQuery.data.id)}
              >
                {isApproved ? "Approved" : "Approve order"}
              </Button>
              <Button
                variant="outline"
                disabled={!isApproved || hasShipment}
                onClick={() => setScheduleOpen(true)}
              >
                Schedule shipment
              </Button>
            </>
          ) : null}
        </CardContent>
        {hasShipment && !isApproved ? (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              A shipment already exists for this PO. Approve the order to continue managing shipment updates.
            </p>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          <CardDescription>Quantities requested by the hospital.</CardDescription>
        </CardHeader>
        <CardContent>
          {orderQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading line items...</div>
          ) : orderQuery.data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderQuery.data.lines.map((line) => {
                  const name = line.itemName ?? `Item #${line.itemId}`;
                  const sku = line.itemSku ?? null;
                  const strength = line.itemStrength ?? null;
                  const unit = line.unit || line.itemUnit || "-";
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">
                        {name}
                        {sku ? <span className="block text-xs text-muted-foreground">{sku}</span> : null}
                        {strength ? (
                          <span className="block text-xs text-muted-foreground">Strength: {strength}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{line.qty}</TableCell>
                      <TableCell>{unit}</TableCell>
                      <TableCell>{currencyFormatter.format(Number(line.price || 0))}</TableCell>
                      <TableCell>{line.notes || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-muted-foreground">No line items available.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule shipment</DialogTitle>
            <DialogDescription>Add tracking details so the hospital can plan receiving.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="vendor-tracking">
                Tracking number (auto-generated)
              </label>
              <Input
                id="vendor-tracking"
                value={trackingNo}
                onChange={(event) => setTrackingNo(event.target.value)}
                placeholder={trackingLoading ? "Generating..." : "Waybill / reference"}
                disabled={trackingLoading}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="vendor-eta">
                ETA
              </label>
              <Input
                id="vendor-eta"
                type="datetime-local"
                value={eta}
                onChange={(event) => setEta(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="vendor-departed">
                Departed at
              </label>
              <Input
                id="vendor-departed"
                type="datetime-local"
                value={departedAt}
                onChange={(event) => setDepartedAt(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="vendor-last-known">
                Last known location
              </label>
              <Input
                id="vendor-last-known"
                value={lastKnown}
                onChange={(event) => setLastKnown(event.target.value)}
                placeholder="Facility, hub, or city"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="vendor-notes">
                Notes
              </label>
              <Input
                id="vendor-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Handling notes (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => scheduleMutation.mutate()} disabled={scheduleMutation.isPending}>
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
