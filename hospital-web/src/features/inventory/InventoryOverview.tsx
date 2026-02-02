import { useMemo, useState } from "react";

import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventoryForecast } from "@/hooks/useInventoryForecast";
import { useInventoryLevels } from "@/hooks/useInventoryLevels";
import { useInventoryLookups } from "@/hooks/useInventoryLookups";

export default function InventoryOverview() {
  const { data: lookups } = useInventoryLookups();
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const levelsQuery = useInventoryLevels(locationFilter === "all" ? undefined : locationFilter);
  const forecastQuery = useInventoryForecast(locationFilter === "all" ? undefined : locationFilter);

  const itemMap = useMemo(() => {
    const map = new Map<string, { minQty: number; unit: string; type: string }>();
    lookups?.items.forEach((item) => {
      map.set(item.id, { minQty: item.minQty ?? 0, unit: item.unit, type: item.type || "supply" });
    });
    return map;
  }, [lookups?.items]);

  const levels = (levelsQuery.data ?? []).map((row) => {
    const meta = itemMap.get(row.itemId);
    return {
      ...row,
      minQty: meta?.minQty ?? 0,
      unit: meta?.unit ?? "",
      type: meta?.type ?? "supply",
    };
  });

  const filteredLevels =
    typeFilter === "all" ? levels : levels.filter((row) => row.type === typeFilter);

  const lowStock = filteredLevels.filter((row) => row.minQty > 0 && row.onhand < row.minQty);
  const totalUnits = filteredLevels.reduce((sum, row) => sum + row.onhand, 0);

  const forecastItems = useMemo(() => {
    const items = forecastQuery.data?.items ?? [];
    const riskOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, UNKNOWN: 3 };
    const filtered =
      typeFilter === "all"
        ? items
        : items.filter((item) => (itemMap.get(item.itemId)?.type ?? "supply") === typeFilter);
    return [...filtered].sort((a, b) => {
      const riskDelta = (riskOrder[a.risk] ?? 3) - (riskOrder[b.risk] ?? 3);
      if (riskDelta !== 0) return riskDelta;
      const aDays = a.daysToStockout ?? Number.POSITIVE_INFINITY;
      const bDays = b.daysToStockout ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    });
  }, [forecastQuery.data?.items, itemMap, typeFilter]);

  const activeLocation =
    locationFilter === "all"
      ? { id: "all", name: "All storage areas" }
      : lookups?.locations.find((loc) => loc.id === locationFilter);

  const formatWhole = (value: number) => Math.round(value).toLocaleString();

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Supply inventory overview</h1>
        <p className="text-muted-foreground max-w-3xl">
          Monitor what is currently on-hand across Logistics 1 storerooms. Filter by a specific location to see the exact
          quantities available before issuing, transferring, or approving replenishment requests.
        </p>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Need a quick glance?</span> Use the dropdown to switch between
            Central Supply, ER storeroom, and other wards. Low stock items are flagged automatically using the minimum levels
            defined in your master data.
          </div>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Current balances</CardTitle>
            <CardDescription>
              Showing {filteredLevels.length} SKU{filteredLevels.length === 1 ? "" : "s"} for{" "}
              {activeLocation?.name ?? "All storage areas"}.
            </CardDescription>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choose location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All storage areas</SelectItem>
                {lookups?.locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} ({loc.kind})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="Tracked SKUs" value={filteredLevels.length} accent="secondary" />
            <SummaryCard label="Total units on-hand" value={totalUnits.toLocaleString()} accent="secondary" />
            <SummaryCard label="Low stock alerts" value={lowStock.length} accent={lowStock.length ? "destructive" : "default"} />
            <SummaryCard label="Locations monitored" value={lookups?.locations.length ?? 0} accent="secondary" />
          </div>

          {levelsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading stock levels.</p>
          ) : filteredLevels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock movement has been recorded yet for this location.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-32">SKU</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-32 text-right">On-hand</TableHead>
                    <TableHead className="w-32 text-right">Min level</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLevels.map((row) => (
                    <TableRow key={row.itemId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{row.name}</span>
                          <span className="text-xs text-muted-foreground">{row.unit || "unit"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{row.sku}</TableCell>
                      <TableCell className="capitalize">{row.type || "supply"}</TableCell>
                      <TableCell className="text-right">{row.onhand.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.minQty ? row.minQty.toLocaleString() : "-"}</TableCell>
                      <TableCell>
                        {row.minQty > 0 ? (
                          row.onhand <= row.minQty ? (
                            <Badge variant="destructive">Restock</Badge>
                          ) : (
                            <Badge variant="outline">Healthy</Badge>
                          )
                        ) : (
                          <Badge variant="secondary">No threshold</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-sky-50/50 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex rounded-full bg-slate-900 p-2 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-lg">AI demand forecast</CardTitle>
              <CardDescription>
                Predicts usage for the next {forecastQuery.data?.horizonDays ?? 30} days and recommends reorder quantities.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-slate-900 text-white hover:bg-slate-900">AI powered</Badge>
            <Badge variant="outline">{forecastQuery.data?.source === "azure" ? "Azure ML live" : "Baseline model"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {forecastQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading forecast data.</p>
          ) : forecastItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage history available yet for forecasting.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-24 text-right">On-hand</TableHead>
                      <TableHead className="w-28 text-right">7d forecast</TableHead>
                      <TableHead className="w-28 text-right">30d forecast</TableHead>
                      <TableHead className="w-32 text-right">Reorder point</TableHead>
                      <TableHead className="w-32 text-right">Suggested order</TableHead>
                      <TableHead className="w-32 text-right">Days until stockout</TableHead>
                      <TableHead className="w-24">Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecastItems.map((row) => (
                      <TableRow key={`forecast-${row.itemId}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{row.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {row.sku} - {row.unit || "unit"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{row.onHand.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatWhole(row.forecast7d)}</TableCell>
                      <TableCell className="text-right">{formatWhole(row.forecastHorizon)}</TableCell>
                      <TableCell className="text-right">{formatWhole(row.reorderPoint)}</TableCell>
                        <TableCell className="text-right">{row.suggestedReorder.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {row.daysToStockout == null ? "N/A" : row.daysToStockout}
                        </TableCell>
                        <TableCell>{renderRiskBadge(row.risk)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>
                  Reorder point is the minimum level to avoid stockouts based on recent usage, lead time, and safety buffer.
                  Suggested order is how many units to buy now to reach the reorder point. Days until stockout estimates how
                  long current stock will last; it shows N/A when there is no recent usage to calculate from. Forecast values
                  are rounded to whole units for easier reading.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {lowStock.length > 0 ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-lg">Low stock watchlist</CardTitle>
            <CardDescription>
              Items listed here are at or below their par levels. Consider raising a requisition or transfer to replenish the
              indicated location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-32 text-right">On-hand</TableHead>
                  <TableHead className="w-32 text-right">Min level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((row) => (
                  <TableRow key={`low-${row.itemId}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{row.name}</span>
                        <span className="text-xs text-muted-foreground">{row.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{row.onhand.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.minQty.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

type SummaryVariant = "default" | "secondary" | "destructive";

function SummaryCard({ label, value, accent = "default" }: { label: string; value: string | number; accent?: SummaryVariant }) {
  const className =
    accent === "destructive"
      ? "border-destructive/40 bg-destructive/5"
      : accent === "secondary"
      ? "border-border/60"
      : "border-border/60";
  return (
    <Card className={className}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function renderRiskBadge(risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN") {
  if (risk === "HIGH") return <Badge variant="destructive">High</Badge>;
  if (risk === "MEDIUM") return <Badge variant="secondary">Medium</Badge>;
  if (risk === "UNKNOWN") return <Badge variant="outline">Unknown</Badge>;
  return <Badge variant="outline">Low</Badge>;
}
