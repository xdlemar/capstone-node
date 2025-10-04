import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useAlmsAssets, useAlmsSchedules } from "@/hooks/useAlmsData";

import { AddScheduleDialog, EditScheduleDialog } from "./components/ScheduleDialogs";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatDate(value?: string | null) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dateFormatter.format(dt);
}

export default function SchedulesPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

  const assetsQuery = useAlmsAssets();
  const schedulesQuery = useAlmsSchedules();

  const assets = assetsQuery.data?.rows ?? [];
  const schedules = schedulesQuery.data?.rows ?? [];

  const assetMap = useMemo(() => {
    const map = new Map<string, { code: string; category: string | null }>();
    assets.forEach((asset) => map.set(asset.id, { code: asset.assetCode, category: asset.category }));
    return map;
  }, [assets]);

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Maintenance schedules</h1>
            <p className="text-muted-foreground max-w-3xl">
              Preventive and inspection cycles keep high-value equipment healthy. Adjust intervals as conditions change.
            </p>
          </div>
          {isManager && assets.length > 0 ? (
            <AddScheduleDialog assets={assets} trigger={<Button>Add schedule</Button>} onSaved={() => schedulesQuery.refetch()} />
          ) : null}
        </div>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Upcoming maintenance</CardTitle>
          <CardDescription>
            Managers can plan cycles and reschedule as work orders progress. Alerts are generated as due dates approach.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Interval (days)</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedulesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-24 w-full" />
                  </TableCell>
                </TableRow>
              ) : schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No schedules yet. {isManager ? "Use \"Add schedule\" to create a maintenance cadence." : "Managers maintain schedules."}
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((schedule) => {
                  const assetInfo = assetMap.get(schedule.assetId);
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {assetInfo?.code ?? `Asset ${schedule.assetId}`}
                        {assetInfo?.category ? (
                          <span className="block text-xs text-muted-foreground">{assetInfo.category}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{schedule.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{schedule.intervalDays ?? "—"}</TableCell>
                      <TableCell>{formatDate(schedule.nextDue)}</TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground">
                        {schedule.notes ? schedule.notes : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isManager ? (
                          <EditScheduleDialog
                            assets={assets}
                            schedule={schedule}
                            trigger={<Button variant="outline" size="sm">Edit</Button>}
                            onSaved={() => schedulesQuery.refetch()}
                            onDeleted={() => schedulesQuery.refetch()}
                          />
                        ) : null}
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

