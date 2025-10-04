import { useState } from "react";
import { ClipboardList, ShieldAlert } from "lucide-react";

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

type HighestRole = "ADMIN" | "MANAGER" | "STAFF";

function getHighestRole(roles: string[]): HighestRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("MANAGER")) return "MANAGER";
  return "STAFF";
}

export default function MissingDocumentsPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const highestRole = getHighestRole(roles);
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
      <Alert className="border-dashed border-destructive/40 bg-destructive/5">
        <AlertTitle>Restricted area</AlertTitle>
        <AlertDescription>
          Document completeness reports are limited to managers and administrators. Contact your supervisor if you need access.
        </AlertDescription>
      </Alert>
    );
  }

  const report = reportQuery.data;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Incomplete documentation</h1>
        <p className="text-muted-foreground max-w-3xl">
          Quickly identify which purchase orders, deliveries, or assets still need supporting documents before close-out.
        </p>
      </header>

      <Alert className="border-primary/50 bg-primary/5">
        <AlertTitle>Manager tools</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <span>
            Signed in as <span className="font-semibold text-foreground">{highestRole}</span>. Provide the reference id (e.g., PO id or delivery id) to compare required tags against what has been uploaded.
          </span>
        </AlertDescription>
      </Alert>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Run missing-document scan
          </CardTitle>
          <CardDescription>Select a module and provide the corresponding numeric id to audit.</CardDescription>
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
                      <Input placeholder="e.g., 1024" {...field} />
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
          <CardDescription>Results refresh each time you run the scan above.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reportQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : !report ? (
            <p className="text-sm text-muted-foreground">Run a scan to view required artefacts for a specific reference.</p>
          ) : report.missing.length === 0 ? (
            <Alert>
              <AlertTitle>No outstanding documents</AlertTitle>
              <AlertDescription>All required artefacts are present for this reference.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Required tags</p>
                <div className="flex flex-wrap gap-2">
                  {report.required.map((item) => (
                    <Badge key={item.tag} variant="secondary">
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">Still missing</p>
                <div className="flex flex-wrap gap-2">
                  {report.missing.map((item) => (
                    <Badge key={item.tag} variant="destructive">
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Present documents</p>
                {report.present.length ? (
                  <ul className="space-y-2 text-sm">
                    {report.present.map((doc) => (
                      <li key={doc.id} className="rounded-md border border-border/60 p-3">
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Tags: {doc.tags.length ? doc.tags.join(", ") : "none"} · Uploaded {new Date(doc.createdAt).toLocaleString()}
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
