import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoutesPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Distribution routes</h1>
        <p className="text-muted-foreground max-w-3xl">
          Plan and monitor vehicle assignments, ETAs, and hub hand-offs.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Route planner</CardTitle>
          <CardDescription>This widget will host the interactive map table.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    </section>
  );
}