import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AlmsAlertsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Asset alerts</h1>
        <p className="text-muted-foreground max-w-3xl">
          Surface overdue maintenance, upcoming warranty expirations, and high-risk equipment notifications.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Alerts queue</CardTitle>
          <CardDescription>Dynamic feed to be populated from the /alms/alerts endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No alerts yet</AlertTitle>
            <AlertDescription>Once we connect the API, time-sensitive notifications will show here.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  );
}
