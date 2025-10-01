import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MissingDocumentsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Incomplete documentation</h1>
        <p className="text-muted-foreground max-w-3xl">
          Review modules or transactions that still require receipts, signatures, or scanned approvals.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Missing documents report</CardTitle>
         
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No outstanding items yet</AlertTitle>
            <AlertDescription>Pending signatures or placeholder uploads will appear here when available.</AlertDescription>
          </Alert>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    </section>
  );
}
