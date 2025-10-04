import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAlmsAssets, useAlmsFinancialSummary } from "@/hooks/useAlmsData";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

export default function FinancialPage() {
  const assetsQuery = useAlmsAssets();
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);

  const financialQuery = useAlmsFinancialSummary(selectedAssetId);

  const assets = useMemo(() => assetsQuery.data?.rows ?? [], [assetsQuery.data?.rows]);

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Asset financials</h1>
        <p className="text-muted-foreground max-w-3xl">
          Track depreciation, book value, and maintenance spend by asset. Select an asset from the registry to load financial snapshots.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Select asset</CardTitle>
          <CardDescription>Only assets with recorded financial snapshots appear in the trend chart.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedAssetId ?? ""} onValueChange={(value) => setSelectedAssetId(value || undefined)}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Choose an asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.assetCode} {asset.category ? `• ${asset.category}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!selectedAssetId ? (
            <p className="text-sm text-muted-foreground">Select an asset to view financial data.</p>
          ) : null}
        </CardContent>
      </Card>

      {selectedAssetId ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Financial summary</CardTitle>
            <CardDescription>Totals and monthly breakdown for the selected asset.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {financialQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !financialQuery.data ? (
              <p className="text-sm text-muted-foreground">No financial snapshots recorded for this asset.</p>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <SummaryTile label="Total depreciation" value={currency.format(financialQuery.data.totals.depreciation)} />
                  <SummaryTile label="Maintenance spend" value={currency.format(financialQuery.data.totals.maintenance)} />
                  <SummaryTile
                    label="Latest book value"
                    value={
                      financialQuery.data.totals.latestBookValue != null
                        ? currency.format(financialQuery.data.totals.latestBookValue)
                        : "—"
                    }
                  />
                </div>

                <div>
                  <h2 className="text-lg font-semibold">Monthly view</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Depreciation</TableHead>
                        <TableHead>Maintenance cost</TableHead>
                        <TableHead>Book value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialQuery.data.periods.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-4 text-center text-sm text-muted-foreground">
                            No financial postings yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        financialQuery.data.periods.map((period) => (
                          <TableRow key={`${period.periodStart}-${period.periodEnd}`}>
                            <TableCell>
                              {dateFormatter.format(new Date(period.periodStart))} – {dateFormatter.format(new Date(period.periodEnd))}
                            </TableCell>
                            <TableCell>{currency.format(period.depreciation)}</TableCell>
                            <TableCell>{currency.format(period.maintenanceCost)}</TableCell>
                            <TableCell>{currency.format(period.bookValue)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-muted/60 bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}




