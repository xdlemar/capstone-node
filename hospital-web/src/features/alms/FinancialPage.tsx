import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinancialPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Asset financials</h1>
        <p className="text-muted-foreground max-w-3xl">
          Depreciation snapshots, maintenance spend, and book-value trends will appear in these widgets.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Depreciation summary</CardTitle>
            <CardDescription>Values sourced from /alms/financial soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32" />
          </CardContent>
        </Card>
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Maintenance spend</CardTitle>
            <CardDescription>Historical spend across assets.</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
