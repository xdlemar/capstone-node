import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsPage() {
  const columns = useMemo(
    () => ["Title", "Module", "Uploaded", "Tags", "Actions"],
    []
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Document workspace</h1>
        <p className="text-muted-foreground max-w-3xl">
          Upload receipts, invoices, and compliance evidence, then search by module or tag.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <CardTitle>Upload new document</CardTitle>
            
          </div>
          <div className="flex w-full max-w-md gap-2">
            <Input placeholder="Document title" />
            <Button disabled>Browse</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Recent documents</CardTitle>
          <CardDescription>Interactive table filtered from /dtrs/documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground">
            {columns.map((col) => (
              <span key={col}>{col}</span>
            ))}
          </div>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    </section>
  );
}
