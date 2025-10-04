import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDocumentSummary, type DocumentSummary } from "@/hooks/useDocumentSummary";
import { useDocumentsList } from "@/hooks/useDocumentSearch";
import { api } from "@/lib/api";

const MODULE_OPTIONS = ["PROCUREMENT", "PROJECT", "DELIVERY", "ASSET", "MAINTENANCE"] as const;

const uploadSchema = z.object({
  module: z.enum(MODULE_OPTIONS, { required_error: "Select a module" }),
  title: z.string().min(3, "Title required"),
  storageKey: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.string().optional(),
  checksum: z.string().optional(),
  projectId: z.string().optional(),
  poId: z.string().optional(),
  receiptId: z.string().optional(),
  deliveryId: z.string().optional(),
  assetId: z.string().optional(),
  woId: z.string().optional(),
  notes: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export default function DocumentsPage() {
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [searchValue, setSearchValue] = useState("");

  const summaryQuery = useDocumentSummary();
  const documentsQuery = useDocumentsList({ module: moduleFilter || undefined, q: searchValue || undefined });

  const summary = summaryQuery.data;
  const documents = documentsQuery.data ?? [];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Document workspace</h1>
        <p className="text-muted-foreground max-w-3xl">
          Upload receipts, invoices, and compliance evidence, then search by module or tag.
        </p>
      </header>

      <StatsRow summary={summary} loading={summaryQuery.isLoading} />

      <UploadDocumentCard />

      <Card className="border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <CardTitle>Recent documents</CardTitle>
            <CardDescription>Filter by module or search by title and tags.</CardDescription>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <FormControl>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="">All modules</SelectItem>
                {MODULE_OPTIONS.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search title or tag"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {documentsQuery.isLoading ? (
            <Skeleton className="h-48" />
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents found for the selected filters.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Storage key</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>{doc.module}</TableCell>
                      <TableCell className="max-w-sm">
                        {doc.tags.length ? (
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(doc.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{doc.storageKey ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function StatsRow({ summary, loading }: { summary?: DocumentSummary; loading: boolean }) {
  const stats = useMemo(
    () => [
      { label: "Total documents", value: summary?.totalDocuments ?? 0 },
      { label: "Uploads (7 days)", value: summary?.recentUploads ?? 0 },
      { label: "Awaiting signatures", value: summary?.awaitingSignatures ?? 0 },
    ],
    [summary]
  );

  return (
    <Card className="border bg-card shadow-sm">
      <CardContent className="p-6">
        {loading ? (
          <Skeleton className="h-20" />
        ) : (
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border/60 p-4 shadow-sm">
                <p className="text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UploadDocumentCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      module: "PROCUREMENT",
      title: "",
      storageKey: "",
      mimeType: "",
      size: "",
      checksum: "",
      projectId: "",
      poId: "",
      receiptId: "",
      deliveryId: "",
      assetId: "",
      woId: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      const payload: Record<string, unknown> = {
        module: values.module,
        title: values.title,
        storageKey: values.storageKey || undefined,
        mimeType: values.mimeType || undefined,
        checksum: values.checksum || undefined,
        size: values.size ? Number(values.size) : undefined,
        projectId: values.projectId || undefined,
        poId: values.poId || undefined,
        receiptId: values.receiptId || undefined,
        deliveryId: values.deliveryId || undefined,
        assetId: values.assetId || undefined,
        woId: values.woId || undefined,
        notes: values.notes || undefined,
      };
      await api.post("/dtrs/documents", payload);
    },
    onSuccess: () => {
      toast({ title: "Document recorded" });
      qc.invalidateQueries({ queryKey: ["dtrs", "documents"] });
      qc.invalidateQueries({ queryKey: ["dtrs", "summary"] });
      form.reset({
        module: "PROCUREMENT",
        title: "",
        storageKey: "",
        mimeType: "",
        size: "",
        checksum: "",
        projectId: "",
        poId: "",
        receiptId: "",
        deliveryId: "",
        assetId: "",
        woId: "",
        notes: "",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err?.response?.data?.error ?? err.message ?? "Unexpected error",
      });
    },
  });

  return (
    <Card className="border bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Upload new document</CardTitle>
        <CardDescription>When integrated with object storage, the storage key will reference the uploaded file.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PO-2025-014 signed copy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="storageKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage key</FormLabel>
                    <FormControl>
                      <Input placeholder="s3://bucket/key" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mimeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MIME type</FormLabel>
                    <FormControl>
                      <Input placeholder="application/pdf" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size (bytes)</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Optional instructions or metadata" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <ScopeFields form={form} />

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Recording..." : "Record document"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ScopeFields({ form }: { form: ReturnType<typeof useForm<UploadFormValues>> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        { name: "projectId", label: "Project id" },
        { name: "poId", label: "PO id" },
        { name: "receiptId", label: "Receipt id" },
        { name: "deliveryId", label: "Delivery id" },
        { name: "assetId", label: "Asset id" },
        { name: "woId", label: "Work order id" },
      ].map((field) => (
        <FormField
          key={field.name}
          control={form.control}
          name={field.name as keyof UploadFormValues}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{field.label}</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...formField} />
              </FormControl>
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}



