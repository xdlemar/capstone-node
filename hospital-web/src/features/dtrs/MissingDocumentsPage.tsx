import { useState } from "react";
import { ClipboardList, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useMissingDocumentsReport } from "@/hooks/useDocumentSearch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const MODULE_OPTIONS = ["PROCUREMENT", "PROJECT", "DELIVERY", "ASSET", "MAINTENANCE"] as const;

const reportSchema = z.object({
  module: z.enum(MODULE_OPTIONS, { required_error: "Select a module" }),
  scopeId: z.string().min(1, "Enter the reference id"),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function MissingDocumentsPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

  const [params, setParams] = useState<ReportFormValues | null>(null);

  const reportQuery = useMissingDocumentsReport(
    { module: params?.module, scopeId: params?.scopeId },
    { enabled: isManager && Boolean(params) }
  );

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      module: "PROCUREMENT",
      scopeId: "",
    },
  });

  if (!isManager) {
    return (
      <Alert className="border-dashed">
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>Only managers and administrators can audit missing documentation.</AlertDescription>
      </Alert>
    );
  }

  const report = reportQuery.data;

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
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Run missing-document scan
          </CardTitle>
          <CardDescription>Select a module and provide the reference id (e.g., PO id or delivery id).</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)_auto]"
              onSubmit={form.handleSubmit((values) => setParams(values))}
            >
              <FormField
                control={form.control}
                name="module"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODULE_OPTIONS.map((module) => (
                          <SelectItem key={module} value={module}>
                            {module}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scopeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference id</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PO numeric id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Check</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Missing documents report
          </CardTitle>
          <CardDescription>Results update each time you run the scan above.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reportQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : !report ? (
            <p className="text-sm text-muted-foreground">Run a scan to view missing document requirements.</p>
          ) : report.missing.length === 0 ? (
            <Alert>
              <AlertTitle>No outstanding documents</AlertTitle>
              <AlertDescription>All required artefacts are present for this reference.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Required</p>
                <div className="flex flex-wrap gap-2">
                  {report.required.map((item) => (
                    <Badge key={item.tag} variant="secondary">
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">Missing</p>
                <div className="flex flex-wrap gap-2">
                  {report.missing.map((item) => (
                    <Badge key={item.tag} variant="destructive">
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Present</p>
                {report.present.length ? (
                  <ul className="space-y-2 text-sm">
                    {report.present.map((doc) => (
                      <li key={doc.id} className="rounded-md border border-border/60 p-3">
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Tags: {doc.tags.length ? doc.tags.join(", ") : "none"} - Uploaded {new Date(doc.createdAt).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No supporting documents yet.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

