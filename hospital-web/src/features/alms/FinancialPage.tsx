import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAlmsAssets, useAlmsFinancialSummary } from "@/hooks/useAlmsData";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const SORT_OPTIONS = [
  { value: "code-asc", label: "Code A-Z" },
  { value: "code-desc", label: "Code Z-A" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "category-asc", label: "Category A-Z" },
  { value: "status-asc", label: "Status A-Z" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export default function FinancialPage() {
  const assetsQuery = useAlmsAssets();
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("code-asc");

  const financialQuery = useAlmsFinancialSummary(selectedAssetId);

  const assets = useMemo(() => assetsQuery.data?.rows ?? [], [assetsQuery.data?.rows]);
  const filteredAssets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let rows = assets;
    if (query) {
      rows = rows.filter((asset) =>
        [asset.assetCode, asset.name, asset.category ?? "", asset.status]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "code-desc":
          return b.assetCode.localeCompare(a.assetCode);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "category-asc":
          return (a.category ?? "").localeCompare(b.category ?? "");
        case "status-asc":
          return a.status.localeCompare(b.status);
        case "code-asc":
        default:
          return a.assetCode.localeCompare(b.assetCode);
      }
    });
    return sorted;
  }, [assets, searchTerm, sortBy]);

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Equipment financials</h1>
        <p className="text-muted-foreground max-w-3xl">
          Track depreciation, book value, and maintenance spend by equipment. Select equipment from the registry to load
          financial snapshots.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Equipment list</CardTitle>
          <CardDescription>Search, sort, and select equipment to view the financial summary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search equipment code, name, category, status"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="sm:max-w-md"
            />
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Sort equipment" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {assetsQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : assetsQuery.error ? (
            <p className="text-sm text-muted-foreground">Unable to load equipment right now.</p>
          ) : filteredAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No equipment matches your search.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                <TableHead>Equipment code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow
                      key={asset.id}
                      className={asset.id === selectedAssetId ? "bg-muted/30" : undefined}
                    >
                      <TableCell className="font-medium">{asset.assetCode}</TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.category ?? "-"}</TableCell>
                      <TableCell>{asset.status}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAssetId(asset.id)}
                        >
                          {asset.id === selectedAssetId ? "Selected" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!selectedAssetId ? (
            <p className="text-sm text-muted-foreground">Select equipment to view financial data.</p>
          ) : null}
        </CardContent>
      </Card>

      {selectedAssetId ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Financial summary</CardTitle>
            <CardDescription>Totals and monthly breakdown for the selected equipment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {financialQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !financialQuery.data ? (
              <p className="text-sm text-muted-foreground">No financial snapshots recorded for this equipment.</p>
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
                        : "-"
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
                              {dateFormatter.format(new Date(period.periodStart))} - {dateFormatter.format(new Date(period.periodEnd))}
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
