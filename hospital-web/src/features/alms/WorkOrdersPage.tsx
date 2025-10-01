import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkOrdersPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Maintenance work orders</h1>
        <p className="text-muted-foreground max-w-3xl">
          Track upcoming and in-progress maintenance tasks
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {["OPEN", "IN_PROGRESS", "COMPLETED"].map((column) => (
          <Card key={column} className="border bg-card shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{column.replace("_", " ")}</CardTitle>
                <Badge variant="secondary" className="text-xs">0</Badge>
              </div>
              <CardDescription>Tickets in this lane will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
