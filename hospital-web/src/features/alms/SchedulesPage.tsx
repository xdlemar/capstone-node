import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SchedulesPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Maintenance schedule</h1>
        <p className="text-muted-foreground max-w-3xl">
          Calendar-style view for preventive maintenance, compliance checks, and calibration events.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Upcoming tasks</CardTitle>
          <CardDescription>Next 30 days of maintenance events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    </section>
  );
}
