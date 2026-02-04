import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useInventoryLookups } from "@/hooks/useInventoryLookups";
import { useAlmsAssets } from "@/hooks/useAlmsData";

import { MaintenanceRequestDialog, RegisterAssetDialog } from "./components/AssetDialogs";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatDate(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dateFormatter.format(dt);
}

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: "default",
  UNDER_MAINTENANCE: "outline",
  RETIRED: "secondary",
  DISPOSED: "destructive",
};

export default function AssetsPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");
  const canRequestMaintenance = roles.includes("STAFF") || isManager;

  const assetsQuery = useAlmsAssets();
  const lookupsQuery = useInventoryLookups();

  const assets = assetsQuery.data?.rows ?? [];

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    lookupsQuery.data?.locations.forEach((loc) => {
      map.set(loc.id, loc.name);
    });
    return map;
  }, [lookupsQuery.data?.locations]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortOption, setSortOption] = useState("name");

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((asset) => set.add(asset.status));
    return Array.from(set).sort();
  }, [assets]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((asset) => {
      const name = asset.locationId ? locationMap.get(asset.locationId) ?? `Location ${asset.locationId}` : "Unassigned";
      set.add(name);
    });
    return Array.from(set).sort();
  }, [assets, locationMap]);

  const filteredAssets = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const base = assets.filter((asset) => {
      const locationName = asset.locationId ? locationMap.get(asset.locationId) ?? `Location ${asset.locationId}` : "Unassigned";
      const matchesSearch =
        !search ||
        [asset.assetCode, asset.name, asset.serialNo]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(search));
      const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
      const matchesLocation = locationFilter === "all" || locationName === locationFilter;
      return matchesSearch && matchesStatus && matchesLocation;
    });

    const sorted = [...base];
    sorted.sort((a, b) => {
      if (sortOption === "status") {
        return a.status.localeCompare(b.status);
      }
      if (sortOption === "warranty") {
        const aTime = a.warrantyUntil ? new Date(a.warrantyUntil).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.warrantyUntil ? new Date(b.warrantyUntil).getTime() : Number.POSITIVE_INFINITY;
        if (aTime === bTime) {
          return (a.assetCode || a.name || "").localeCompare(b.assetCode || b.name || "");
        }
        return aTime - bTime;
      }
      const aLabel = (a.name || a.assetCode || "").toLowerCase();
      const bLabel = (b.name || b.assetCode || "").toLowerCase();
      return aLabel.localeCompare(bLabel);
    });

    return sorted;
  }, [assets, locationFilter, locationMap, searchTerm, sortOption, statusFilter]);

  const totalAssets = assetsQuery.data?.total ?? assets.length;
  const filtersActive = statusFilter !== "all" || locationFilter !== "all" || searchTerm.trim().length > 0;
  const canReset = filtersActive || sortOption !== "name";

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Equipment registry</h1>
            <p className="text-muted-foreground max-w-3xl">
              Browse tagged biomedical equipment, review warranty timelines, and launch maintenance workflows. Staff can
              raise requests, while managers and admins can register and maintain equipment directly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canRequestMaintenance && (
              <MaintenanceRequestDialog
                assets={assets}
                trigger={<Button variant="outline">Request maintenance</Button>}
                onSubmitted={() => {
                  // no asset data change, but downstream views may refetch
                }}
              />
            )}
            {isManager && (
              <RegisterAssetDialog
                locations={lookupsQuery.data?.locations ?? []}
                disabled={lookupsQuery.isLoading}
                onCreated={() => assetsQuery.refetch()}
              />
            )}
          </div>
        </div>
        {lookupsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading reference data.</p> : null}
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
          <CardDescription>
            Showing {filteredAssets.length} of {totalAssets} equipment items{filtersActive ? " (filters applied)" : ""}. Managers can
            register equipment; staff can raise maintenance requests only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Input
                className="sm:w-72"
                placeholder="Search equipment name, code, or serial"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="warranty">Warranty (soonest)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setLocationFilter("all");
                  setSortOption("name");
                }}
                disabled={!canReset}
              >
                Reset
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-24 w-full" />
                  </TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No equipment found yet. {isManager ? "Use the Register equipment button to add one." : "Managers can register equipment; you can raise maintenance requests."}
                  </TableCell>
                </TableRow>
              ) : filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No equipment matches the current filters. Adjust filters or reset to view all equipment.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => {
                  const locationName = asset.locationId ? locationMap.get(asset.locationId) ?? `Location ${asset.locationId}` : "Unassigned";
                  const statusVariant = (STATUS_VARIANTS[asset.status] ?? "secondary") as "default" | "secondary" | "destructive" | "outline";
                  return (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{asset.assetCode}</span>
                          {asset.serialNo ? (
                            <span className="text-xs text-muted-foreground">Serial: {asset.serialNo}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{asset.category ?? "-"}</TableCell>
                      <TableCell>{locationName}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>{asset.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(asset.warrantyUntil)}</TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        {asset.notes ? asset.notes : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
