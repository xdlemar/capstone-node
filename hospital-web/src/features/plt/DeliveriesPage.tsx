import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveriesPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Project deliveries</h1>
        <p className="text-muted-foreground max-w-3xl">
          Monitor shipment statuses, ETAs, and POD photos across all active logistics routes.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Live delivery board</CardTitle>
          <CardDescription>Timeline and milestone cards will render here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    </section>
  );
}