import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryLookups } from "@/hooks/useInventoryLookups";
import { useProcurementInsights } from "@/hooks/useProcurementInsights";
import { cn } from "@/lib/utils";

function Money({ value }: { value: number }) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
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

  const { topVendorsBySpend, priceLeaders } = insights.data;

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
            <CardTitle>Top vendors by spend</CardTitle>
            <CardDescription>Based on cumulative PO values.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topVendorsBySpend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchase order history yet.</p>
            ) : (
              <ul className="space-y-3">
                {topVendorsBySpend.slice(0, 5).map((vendor) => (
                  <li key={vendor.vendorId} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{vendor.vendorName}</p>
                      <p className="text-xs text-muted-foreground">
                        On-time {vendor.onTimePercentage ?? "-"}% &bull; Lead time {vendor.avgLeadTimeDays ?? "-"} days
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{Money(vendor.totalSpend)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Price leaders by item</CardTitle>
            <CardDescription>Vendors offering the best average unit cost.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {priceLeaders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pricing history not available yet.</p>
            ) : (
              <ul className="space-y-3">
                {priceLeaders.slice(0, 6).map((leader) => {
                  const item = itemMap.get(leader.itemId);
                  const label = item ? `${item.name} (${item.sku})` : `Item ${leader.itemId}`;
                  return (
                    <li key={`${leader.itemId}-${leader.bestVendor.vendorId}`} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <TrendingDown className="h-4 w-4 text-emerald-500" />
                        {leader.bestVendor.vendorName}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span>Avg price {Money(leader.bestVendor.avgPrice)}</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <TrendingUp className="h-4 w-4" />
                          {leader.savingsPercent}% savings vs avg
                        </span>
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



