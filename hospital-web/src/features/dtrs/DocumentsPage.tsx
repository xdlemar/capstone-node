import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDocumentSummary, type DocumentSummary } from "@/hooks/useDocumentSummary";
import { useDocumentsList, type DocumentRecord } from "@/hooks/useDocumentSearch";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const MODULE_OPTIONS = ["PROCUREMENT", "PROJECT", "DELIVERY", "ASSET", "MAINTENANCE"] as const;
const SORT_OPTIONS = [
  { value: "created-desc", label: "Newest first" },
  { value: "created-asc", label: "Oldest first" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "module-asc", label: "Module A-Z" },
  { value: "module-desc", label: "Module Z-A" },
  { value: "status-pending", label: "Pending uploads first" },
] as const;
const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "filed", label: "Filed" },
  { value: "pending", label: "Pending upload" },
] as const;

const DEFAULT_PAGE_SIZE = 25;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

type StatusTotals = {
  all: number;
  filed: number;
  pending: number;
};

const DOCUMENT_STATUS = {
  FILED: "Filed",
  PLACEHOLDER: "Pending upload",
} as const;

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

type HighestRole = "ADMIN" | "MANAGER" | "STAFF";

type SummaryProps = {
  summary: DocumentSummary | undefined;
  loading: boolean;
};

type UploadCardProps = {
  isManager: boolean;
  onSuccess: () => void;
};

type StatusFilterButtonsProps = {
  active: StatusFilter;
  counts: StatusTotals;
  onChange: (value: StatusFilter) => void;
};

type DocumentRowProps = {
  doc: DocumentRecord;
  onCopyKey: (key?: string | null) => void;
};

function computeStatus(storageKey?: string | null): typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS] {
  if (!storageKey) return DOCUMENT_STATUS.PLACEHOLDER;
  return storageKey.startsWith("placeholder:") ? DOCUMENT_STATUS.PLACEHOLDER : DOCUMENT_STATUS.FILED;
}

function getHighestRole(roles: string[]): HighestRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("MANAGER")) return "MANAGER";
  return "STAFF";
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const highestRole = getHighestRole(roles);
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

  const [moduleFilter, setModuleFilter] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created-desc");
  const [visibleCount, setVisibleCount] = useState(DEFAULT_PAGE_SIZE);

  const summaryQuery = useDocumentSummary();
  const documentsQuery = useDocumentsList({ module: moduleFilter || undefined, q: searchValue || undefined });

  const summary = summaryQuery.data;
  const documents = documentsQuery.data ?? [];

  const statusTotals = useMemo<StatusTotals>(() => {
    const totals: StatusTotals = { all: documents.length, filed: 0, pending: 0 };
    for (const doc of documents) {
      const status = computeStatus(doc.storageKey);
      if (status === DOCUMENT_STATUS.FILED) totals.filed += 1;
      else totals.pending += 1;
    }
    return totals;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    let rows = documents;
    if (statusFilter !== "all") {
      rows = rows.filter((doc) => {
        const status = computeStatus(doc.storageKey);
        return statusFilter === "filed"
          ? status === DOCUMENT_STATUS.FILED
          : status === DOCUMENT_STATUS.PLACEHOLDER;
      });
    }

    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "created-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "module-asc": {
          const cmp = a.module.localeCompare(b.module);
          return cmp !== 0 ? cmp : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        case "module-desc": {
          const cmp = b.module.localeCompare(a.module);
          return cmp !== 0 ? cmp : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        case "status-pending": {
          const statusA = computeStatus(a.storageKey);
          const statusB = computeStatus(b.storageKey);
          if (statusA === statusB) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          if (statusA === DOCUMENT_STATUS.PLACEHOLDER) return -1;
          if (statusB === DOCUMENT_STATUS.PLACEHOLDER) return 1;
          return 0;
        }
        case "created-desc":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return sorted;
  }, [documents, sortBy, statusFilter]);

  useEffect(() => {
    setVisibleCount(DEFAULT_PAGE_SIZE);
  }, [moduleFilter, searchValue, statusFilter, sortBy, documents.length]);

  const visibleDocuments = filteredDocuments.slice(0, visibleCount);
  const hasMore = filteredDocuments.length > visibleCount;
  const filtersActive = moduleFilter !== "" || searchValue.trim().length > 0 || statusFilter !== "all";

  const { toast } = useToast();

  const awaitingSignatures = summary?.awaitingSignatures ?? 0;


  const handleResetFilters = () => {
    setModuleFilter("");
    setSearchValue("");
    setStatusFilter("all");
  };

  const handleCopyKey = async (key?: string | null) => {
    if (!key) {
      toast({ variant: "destructive", title: "No storage key", description: "This record is still pending upload." });
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(key);
        toast({ title: "Copied", description: "Storage key copied to clipboard." });
      } else {
        throw new Error("Clipboard unavailable");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: err?.message ?? "Unable to access clipboard. Copy manually instead.",
      });
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Document workspace</h1>
        <p className="text-muted-foreground max-w-3xl">
          Track receipts, invoices, and compliance paperwork across the Logistics 1 document hub.
        </p>
      </header>

      <Alert className="border-primary/50 bg-primary/5">
        <AlertTitle>Document permissions</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <span>
            Signed in as <span className="font-semibold text-foreground">{highestRole}</span>. Staff can record and update
            entries, while managers unlock analytics and missing-document checks.
          </span>
          <Badge variant="secondary">Role: {highestRole}</Badge>
          {awaitingSignatures > 0 ? (
            <Badge variant="destructive">Awaiting signatures: {awaitingSignatures}</Badge>
          ) : null}
        </AlertDescription>
      </Alert>

      <StatsRow summary={summary} loading={summaryQuery.isLoading} />

      <Card className="border bg-card shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <CardTitle>Document library</CardTitle>
              <CardDescription>
                Filter by module, keywords, or status to surface urgent transactions without endless scrolling.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All modules</SelectItem>
                  {MODULE_OPTIONS.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  placeholder="Search title, tag, or storage key"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="sm:w-72"
                />
                <Button type="button" variant="ghost" disabled={!filtersActive} onClick={handleResetFilters}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
          <StatusFilterButtons active={statusFilter} counts={statusTotals} onChange={setStatusFilter} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-muted-foreground">
              {documentsQuery.isLoading
                ? "Loading documents..."
                : filteredDocuments.length === 0
                ? "No documents match the selected filters."
                : `Showing ${visibleDocuments.length} of ${filteredDocuments.length} records (${documents.length} fetched).`}
            </p>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {documentsQuery.isLoading ? (
            <Skeleton className="h-48" />
          ) : documentsQuery.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load documents</AlertTitle>
              <AlertDescription>
                {documentsQuery.error instanceof Error
                  ? documentsQuery.error.message
                  : "Unexpected error while loading the document list."}
              </AlertDescription>
            </Alert>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {filtersActive
                ? "No documents match the selected filters. Try broadening the search or clearing the status filter."
                : "No documents have been recorded yet."}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Title</TableHead>
                      <TableHead className="min-w-[110px]">Module</TableHead>
                      <TableHead className="min-w-[160px]">References</TableHead>
                      <TableHead className="min-w-[160px]">Tags</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-48">Uploaded</TableHead>
                      <TableHead className="min-w-[200px]">Storage key</TableHead>
                      <TableHead className="w-28 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleDocuments.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} onCopyKey={handleCopyKey} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {hasMore ? (
                <div className="flex justify-center pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibleCount((value) => value + DEFAULT_PAGE_SIZE)}
                  >
                    Show more ({filteredDocuments.length - visibleDocuments.length} remaining)
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadCard isManager={isManager} onSuccess={() => setVisibleCount(DEFAULT_PAGE_SIZE)} />
    </section>
  );
}

function StatsRow({ summary, loading }: SummaryProps) {
  if (loading && !summary) {
    return (
      <Card className="border bg-card shadow-sm">
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalDocuments = summary?.totalDocuments ?? 0;
  const recentUploads = summary?.recentUploads ?? 0;
  const awaitingSignatures = summary?.awaitingSignatures ?? 0;

  return (
    <Card className="border bg-card shadow-sm">
      <CardContent className="grid gap-4 p-6 md:grid-cols-3">
        <SummaryTile label="Total documents" value={totalDocuments} />
        <SummaryTile label="Uploads (7 days)" value={recentUploads} />
        <SummaryTile
          label="Awaiting signatures"
          value={awaitingSignatures}
          tone={awaitingSignatures ? "alert" : "ok"}
        />
      </CardContent>
    </Card>
  );
}

function UploadCard({ isManager, onSuccess }: UploadCardProps) {
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

  const qc = useQueryClient();
  const { toast } = useToast();

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
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err?.response?.data?.error ?? err?.message ?? "Unexpected error",
      });
    },
  });

  return (
    <Card className="border bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Record or upload document</CardTitle>
        <CardDescription>
          {isManager
            ? "Managers and administrators can attach approvals and media straight away."
            : "Frontline staff can capture placeholders now and link storage keys when the file is ready."}
        </CardDescription>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
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
                    <Input placeholder="e.g., PO-2025-014 signed copy" {...field} />
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
                    <Input placeholder="s3://bucket/key" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mimeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MIME type</FormLabel>
                    <Input placeholder="application/pdf" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size (bytes)</FormLabel>
                    <Input placeholder="Optional" {...field} />
                    <FormMessage />
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
                  <Textarea rows={3} placeholder="Optional instructions or metadata" {...field} />
                  <FormMessage />
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

function StatusFilterButtons({ active, counts, onChange }: StatusFilterButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_FILTERS.map((item) => {
        const isActive = active === item.value;
        const count = item.value === "all" ? counts.all : item.value === "filed" ? counts.filed : counts.pending;
        return (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={isActive ? "default" : "outline"}
            onClick={() => onChange(item.value)}
            className={cn("flex items-center gap-2", isActive ? "shadow-sm" : "")}
          >
            {item.label}
            <Badge variant={isActive ? "secondary" : "outline"}>{count}</Badge>
          </Button>
        );
      })}
    </div>
  );
}

function DocumentRow({ doc, onCopyKey }: DocumentRowProps) {
  const status = computeStatus(doc.storageKey);
  const references = useMemo(() => {
    const refs: Array<{ label: string; value: string }> = [];
    if (doc.poId) refs.push({ label: "PO", value: doc.poId });
    if (doc.projectId) refs.push({ label: "Project", value: doc.projectId });
    if (doc.receiptId) refs.push({ label: "Receipt", value: doc.receiptId });
    if (doc.deliveryId) refs.push({ label: "Delivery", value: doc.deliveryId });
    if (doc.assetId) refs.push({ label: "Asset", value: doc.assetId });
    if (doc.woId) refs.push({ label: "Work order", value: doc.woId });
    return refs;
  }, [doc.assetId, doc.deliveryId, doc.poId, doc.projectId, doc.receiptId, doc.woId]);

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{doc.title}</span>
          <span className="text-xs text-muted-foreground">Uploader: {doc.uploaderId ?? "—"}</span>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <Badge variant="secondary">{doc.module}</Badge>
      </TableCell>
      <TableCell className="align-top">
        {references.length ? (
          <div className="flex flex-wrap gap-1 text-xs">
            {references.map((ref) => (
              <Badge key={`${doc.id}-${ref.label}-${ref.value}`} variant="outline">
                {ref.label}: {ref.value}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        {doc.tags.length ? (
          <div className="flex flex-wrap gap-1 text-xs">
            {doc.tags.map((tag) => (
              <Badge key={`${doc.id}-${tag}`} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        <Badge variant={status === DOCUMENT_STATUS.FILED ? "secondary" : "destructive"}>{status}</Badge>
      </TableCell>
      <TableCell className="align-top text-sm text-muted-foreground">{formatDate(doc.createdAt)}</TableCell>
      <TableCell className="align-top font-mono text-xs">
        {doc.storageKey ? (
          <span className="line-clamp-2 break-all" title={doc.storageKey}>
            {doc.storageKey}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="align-top text-right">
        <Button type="button" variant="outline" size="sm" onClick={() => onCopyKey(doc.storageKey)}>
          Copy key
        </Button>
      </TableCell>
    </TableRow>
  );
}

function SummaryTile({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "alert" | "ok" }) {
  const toneClass = tone === "alert" ? "border-destructive/40 bg-destructive/5" : tone === "ok" ? "border-border/60" : "border-border/60";
  return (
    <Card className={toneClass}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
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
              <Input placeholder="Optional" {...formField} />
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
