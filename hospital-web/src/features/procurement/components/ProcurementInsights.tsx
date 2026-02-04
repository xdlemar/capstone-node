import { TrendingUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryLookups } from "@/hooks/useInventoryLookups";
import { useProcurementInsights } from "@/hooks/useProcurementInsights";
import { cn } from "@/lib/utils";

function formatWhole(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function ProcurementInsightsPanel({ className }: { className?: string }) {
  const insights = useProcurementInsights();
  const inventory = useInventoryLookups();

  const itemMap = new Map(inventory.data?.items.map((item) => [item.id, item]) ?? []);

  if (insights.isLoading) {
    return <Skeleton className={cn("h-64 w-full", className)} />;
  }

  if (insights.error || !insights.data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Supplier insights</CardTitle>
          <CardDescription>Unable to load procurement analytics right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { topVendorsByOrders, topItemsByQty } = insights.data;

  return (
    <section className={cn("space-y-4", className)}>
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">Supplier insights</h2>
        <p className="text-sm text-muted-foreground">
          Highlights from purchase orders and vendor performance metrics to guide sourcing decisions.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Top vendors by orders</CardTitle>
            <CardDescription>Based on total PO volume.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topVendorsByOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchase order history yet.</p>
            ) : (
              <ul className="space-y-3">
                {topVendorsByOrders.slice(0, 5).map((vendor) => (
                  <li key={vendor.vendorId} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{vendor.vendorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatWhole(vendor.orderCount)} order(s)
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{formatWhole(vendor.totalQty)} units</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Most ordered items</CardTitle>
            <CardDescription>Top items by total quantity ordered.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topItemsByQty.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchase order history yet.</p>
            ) : (
              <ul className="space-y-3">
                {topItemsByQty.slice(0, 6).map((itemStat) => {
                  const item = itemMap.get(itemStat.itemId);
                  const label = item ? `${item.name} (${item.sku})` : `Item ${itemStat.itemId}`;
                  return (
                    <li key={itemStat.itemId} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        {label}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span>{formatWhole(itemStat.totalQty)} units ordered</span>
                        <span className="text-muted-foreground">{formatWhole(itemStat.orderLines)} line(s)</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}



