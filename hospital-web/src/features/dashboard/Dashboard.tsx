import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Low Stock</CardTitle></CardHeader>
        <CardContent>Coming soon…</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Open PR / PO</CardTitle></CardHeader>
        <CardContent>Coming soon…</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Deliveries Today</CardTitle></CardHeader>
        <CardContent>Coming soon…</CardContent>
      </Card>
    </div>
  );
}
