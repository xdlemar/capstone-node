import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Project allocations</h1>
        <p className="text-muted-foreground max-w-3xl">
          Track material usage, project budgets, and logistics milestones for every active initiative.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Projects list</CardTitle>
          <CardDescription>Coming soon: sortable table powered by /plt/projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    </section>
  );
}