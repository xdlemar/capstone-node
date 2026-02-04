import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

import { useVendorOrderHistory } from "@/hooks/useVendorOrders";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function statusVariant(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "OPEN") return "default";
  if (normalized === "PARTIAL") return "secondary";
  if (normalized === "CANCELLED") return "destructive";
  return "outline";
}

function deliveryBadge(status?: string | null) {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  const normalized = status.toUpperCase();
  if (normalized === "DELIVERED") return <Badge variant="secondary">Delivered</Badge>;
  if (normalized === "DELAYED") return <Badge variant="destructive">Delayed</Badge>;
  if (normalized === "IN_TRANSIT" || normalized === "DISPATCHED") {
    return <Badge variant="outline">In transit</Badge>;
  }
  if (normalized === "CANCELLED") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">{normalized}</Badge>;
}

const STATUS_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "Partial", value: "PARTIAL" },
  { label: "Received", value: "RECEIVED" },
  { label: "Closed", value: "CLOSED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function VendorOrderHistoryPage() {
  const historyQuery = useVendorOrderHistory();
  const [status, setStatus] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortKey, setSortKey] = useState("orderedDesc");

  const filtered = useMemo(() => {
    const rows = historyQuery.data ?? [];
    const filteredRows = rows.filter((order) => {
      if (status !== "ALL") {
        if (status === "RECEIVED") {
          if ((order.deliveryStatus || "").toUpperCase() !== "DELIVERED") return false;
        } else if (order.status !== status) {
          return false;
        }
      }
      const orderedAt = new Date(order.orderedAt).getTime();
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderedAt < start.getTime()) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderedAt > end.getTime()) return false;
      }
      return true;
    });
    const sorted = [...filteredRows];
    if (sortKey === "orderedAsc") {
      sorted.sort((a, b) => new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime());
    } else if (sortKey === "orderedDesc") {
      sorted.sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());
    } else if (sortKey === "delivery") {
      sorted.sort((a, b) => (a.deliveryStatus || "").localeCompare(b.deliveryStatus || ""));
    }
    return sorted;
  }, [historyQuery.data, status, startDate, endDate, sortKey]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Order history</h1>
          <p className="text-muted-foreground max-w-3xl">
            Review delivered and archived purchase orders assigned to your vendor account.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/vendor/orders">Back to orders</Link>
        </Button>
      </header>

      {historyQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>We couldn&apos;t load your order history right now. Please try again.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine the history list by status and ordered date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>From</Label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>To</Label>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Sort</Label>
            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orderedDesc">Newest first</SelectItem>
                <SelectItem value="orderedAsc">Oldest first</SelectItem>
                <SelectItem value="delivery">Delivery status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setStatus("ALL");
                setStartDate("");
                setEndDate("");
                setSortKey("orderedDesc");
              }}
            >
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History list</CardTitle>
          <CardDescription>Orders matching your filters.</CardDescription>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading order history...</div>
          ) : filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total qty</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.poNo}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>{deliveryBadge(order.deliveryStatus)}</TableCell>
                    <TableCell>{dateFormatter.format(new Date(order.orderedAt))}</TableCell>
                    <TableCell>{order.lineCount}</TableCell>
                    <TableCell>{order.totalQty}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/vendor/orders/${order.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-muted-foreground">No orders match your filters.</div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
