import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssetsPage() {
  const columns = useMemo(
    () => ["Asset code", "Category", "Location", "Status", "Warranty"],
    []
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Asset registry</h1>
        <p className="text-muted-foreground max-w-3xl">
          Browse tagged equipment, track warranty and location details, and launch maintenance or transfer actions. This
          screen will render the live asset dataset once the API hook is wired in.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>Interactive data table coming next.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground">
            {columns.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </section>
  );
}
