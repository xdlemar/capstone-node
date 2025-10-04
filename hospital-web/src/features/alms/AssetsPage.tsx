import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
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
  UNDER_MAINTENANCE: "warning",
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

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Asset registry</h1>
            <p className="text-muted-foreground max-w-3xl">
              Browse tagged biomedical equipment, review warranty timelines, and launch maintenance workflows. Staff can
              raise requests, while managers and admins can register and maintain assets directly.
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
        {lookupsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading reference data…</p> : null}
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>
            Showing {assets.length} of {assetsQuery.data?.total ?? "—"} assets. Managers can register equipment; staff can
            raise maintenance requests only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
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
                    No assets found yet. {isManager ? "Use \"Register asset\" to add one." : "Managers can register equipment; you can raise maintenance requests."}
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => {
                  const locationName = asset.locationId ? locationMap.get(asset.locationId) ?? `Location ${asset.locationId}` : "Unassigned";
                  const statusVariant = (STATUS_VARIANTS[asset.status] ?? "secondary") as
                    | "default"
                    | "secondary"
                    | "destructive"
                    | "outline"
                    | "warning";
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
                      <TableCell>{asset.category ?? "—"}</TableCell>
                      <TableCell>{locationName}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>{asset.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(asset.warrantyUntil)}</TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        {asset.notes ? asset.notes : "—"}
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







