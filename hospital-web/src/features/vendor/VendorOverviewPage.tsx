import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVendorOrders } from "@/hooks/useVendorOrders";
import { useVendorShipments } from "@/hooks/useVendorShipments";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function statusVariant(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "OPEN" || normalized === "IN_TRANSIT" || normalized === "DISPATCHED") return "default";
  if (normalized === "PARTIAL" || normalized === "RECEIVED" || normalized === "DELAYED") return "secondary";
  if (normalized === "CANCELLED") return "destructive";
  return "outline";
}

export default function VendorOverviewPage() {
  const ordersQuery = useVendorOrders();
  const shipmentsQuery = useVendorShipments();

  const orders = ordersQuery.data ?? [];
  const shipments = shipmentsQuery.data ?? [];

  const orderCounts = orders.reduce(
    (acc, order) => {
      acc.total += 1;
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  const now = Date.now();
  const shipmentCounts = shipments.reduce(
    (acc, shipment) => {
      acc.total += 1;
      acc[shipment.status] = (acc[shipment.status] ?? 0) + 1;
      const etaTime = shipment.eta ? new Date(shipment.eta).getTime() : null;
      const etaMissed =
        etaTime !== null &&
        etaTime < now &&
        shipment.status !== "DELIVERED" &&
        shipment.status !== "CANCELLED";
      if (etaMissed) acc.etaRisk += 1;
      return acc;
    },
    { total: 0, etaRisk: 0 } as Record<string, number>
  );

  const recentOrders = orders.slice(0, 5);
  const recentShipments = shipments.slice(0, 5);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Vendor overview</h1>
          <p className="text-muted-foreground max-w-3xl">
            Monitor purchase orders, shipping milestones, and upcoming ETAs in one place.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/vendor/orders">View all orders</Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Open orders" value={orderCounts.OPEN ?? 0} />
        <SummaryCard label="Partial / received" value={(orderCounts.PARTIAL ?? 0) + (orderCounts.RECEIVED ?? 0)} />
        <SummaryCard label="In transit" value={(shipmentCounts.DISPATCHED ?? 0) + (shipmentCounts.IN_TRANSIT ?? 0)} />
        <SummaryCard label="ETA at risk" value={shipmentCounts.etaRisk ?? 0} tone={shipmentCounts.etaRisk ? "alert" : "neutral"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Latest purchase orders sent by the hospital.</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading orders...</div>
            ) : recentOrders.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.poNo}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>{dateFormatter.format(new Date(order.orderedAt))}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/vendor/orders/${order.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">No orders yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent shipments</CardTitle>
            <CardDescription>Latest shipping updates tied to your POs.</CardDescription>
          </CardHeader>
          <CardContent>
            {shipmentsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading shipments...</div>
            ) : recentShipments.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium">{shipment.trackingNo || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(shipment.status)}>{shipment.status}</Badge>
                      </TableCell>
                      <TableCell>{shipment.eta ? dateFormatter.format(new Date(shipment.eta)) : "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/vendor/shipments">Update</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">No shipment updates yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "alert";
}) {
  return (
    <Card className={tone === "alert" ? "border-destructive/40 bg-destructive/5" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
