import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LogisticsAlertsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Logistics alerts</h1>
        <p className="text-muted-foreground max-w-3xl">
          Stay ahead of delayed deliveries, expiring permits, or route disruptions.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Alert feed</CardTitle>
          <CardDescription>Once connected, live alerts from /plt/alerts will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No alerts yet</AlertTitle>
            <AlertDescription>When the service starts emitting alerts, they will stack in this panel.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  );
}