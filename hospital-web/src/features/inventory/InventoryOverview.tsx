import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventoryLevels } from "@/hooks/useInventoryLevels";
import { useInventoryLookups } from "@/hooks/useInventoryLookups";

export default function InventoryOverview() {
  const { data: lookups } = useInventoryLookups();
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const levelsQuery = useInventoryLevels(locationFilter === "all" ? undefined : locationFilter);

  const itemMap = useMemo(() => {
    const map = new Map<string, { minQty: number; unit: string }>();
    lookups?.items.forEach((item) => {
      map.set(item.id, { minQty: item.minQty ?? 0, unit: item.unit });
    });
    return map;
  }, [lookups?.items]);

  const levels = (levelsQuery.data ?? []).map((row) => {
    const meta = itemMap.get(row.itemId);
    return {
      ...row,
      minQty: meta?.minQty ?? 0,
      unit: meta?.unit ?? "",
    };
  });

  const lowStock = levels.filter((row) => row.minQty > 0 && row.onhand < row.minQty);
  const totalUnits = levels.reduce((sum, row) => sum + row.onhand, 0);

  const activeLocation =
    locationFilter === "all"
      ? { id: "all", name: "All storage areas" }
      : lookups?.locations.find((loc) => loc.id === locationFilter);

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
              Showing {levels.length} SKU{levels.length === 1 ? "" : "s"} for {activeLocation?.name ?? "All storage areas"}.
            </CardDescription>
          </div>
          <div className="w-full max-w-xs">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="Tracked SKUs" value={levels.length} accent="secondary" />
            <SummaryCard label="Total units on-hand" value={totalUnits.toLocaleString()} accent="secondary" />
            <SummaryCard label="Low stock alerts" value={lowStock.length} accent={lowStock.length ? "destructive" : "default"} />
            <SummaryCard
              label="Locations monitored"
              value={lookups?.locations.length ?? 0}
              accent="secondary"
            />
          </div>

          {levelsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading stock levels…</p>
          ) : levels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock movement has been recorded yet for this location.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-32">SKU</TableHead>
                    <TableHead className="w-32 text-right">On-hand</TableHead>
                    <TableHead className="w-32 text-right">Min level</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levels.map((row) => (
                    <TableRow key={row.itemId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{row.name}</span>
                          <span className="text-xs text-muted-foreground">{row.unit || "unit"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{row.sku}</TableCell>
                      <TableCell className="text-right">{row.onhand.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.minQty ? row.minQty.toLocaleString() : "—"}</TableCell>
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

