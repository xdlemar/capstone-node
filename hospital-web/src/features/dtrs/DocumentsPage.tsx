import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useDocumentsList, type DocumentRecord } from "@/hooks/useDocumentSearch";
import { useProcurementPoOptions } from "@/hooks/useProcurementPoOptions";
import { usePltDeliveries, usePltProjects } from "@/hooks/usePltData";
import { useAlmsAssets, useAlmsWorkOrders } from "@/hooks/useAlmsData";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const MODULE_OPTIONS = ["PROCUREMENT", "PROJECT", "DELIVERY", "ASSET", "MAINTENANCE", "OTHER"] as const;
const MODULE_DOC_TYPES: Record<
  (typeof MODULE_OPTIONS)[number],
  Array<{ label: string; tag: string }>
> = {
  PROCUREMENT: [
    { label: "Signed Purchase Order", tag: "PO" },
    { label: "Delivery Receipt", tag: "DR" },
    { label: "Supplier Invoice", tag: "INVOICE" },
  ],
  DELIVERY: [
    { label: "Delivery Receipt", tag: "DR" },
    { label: "Delivery Photos", tag: "PHOTO" },
  ],
  PROJECT: [
    { label: "Project Implementation Plan", tag: "PROJECT_PLAN" },
    { label: "Project Acceptance Form", tag: "ACCEPTANCE" },
  ],
  ASSET: [],
  MAINTENANCE: [],
  OTHER: [],
};
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

const PAGE_SIZE = 10;

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
  projectId: z.string().optional(),
  poId: z.string().optional(),
  deliveryId: z.string().optional(),
  assetId: z.string().optional(),
  woId: z.string().optional(),
  docTag: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.module === "PROCUREMENT" && !values.poId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["poId"], message: "Select a purchase order" });
  }
  if (values.module === "DELIVERY" && !values.deliveryId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryId"], message: "Select a delivery" });
  }
  if (values.module === "PROJECT" && !values.projectId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["projectId"], message: "Select a project" });
  }
  if (values.module === "ASSET" && !values.assetId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["assetId"], message: "Select an asset" });
  }
  if (values.module === "MAINTENANCE" && !values.woId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["woId"], message: "Select a work order" });
  }
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
  onViewDetails: (id: string) => void;
  onViewFile: (key?: string | null) => void;
};

function computeStatus(storageKey?: string | null): typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS] {
  if (!storageKey) return DOCUMENT_STATUS.PLACEHOLDER;
  return storageKey.startsWith("placeholder:") ? DOCUMENT_STATUS.PLACEHOLDER : DOCUMENT_STATUS.FILED;
}

function hasStoredFile(storageKey?: string | null) {
  return Boolean(storageKey && !storageKey.startsWith("placeholder:"));
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
  const navigate = useNavigate();

  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created-desc");
  const [page, setPage] = useState(1);

  const summaryQuery = useDocumentSummary({ enabled: isManager });
  const documentsQuery = useDocumentsList({
    module: moduleFilter === "ALL" ? undefined : moduleFilter,
    q: searchValue || undefined,
  });

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
    setPage(1);
  }, [moduleFilter, searchValue, statusFilter, sortBy, documents.length]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visibleDocuments = filteredDocuments.slice(pageStart, pageStart + PAGE_SIZE);
  const filtersActive = moduleFilter !== "ALL" || searchValue.trim().length > 0 || statusFilter !== "all";

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const { toast } = useToast();

  const awaitingSignatures = isManager ? summary?.awaitingSignatures ?? 0 : 0;


  const handleResetFilters = () => {
    setModuleFilter("ALL");
    setSearchValue("");
    setStatusFilter("all");
    setPage(1);
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

  const handleViewFile = async (key?: string | null) => {
    if (!key || key.startsWith("placeholder:")) {
      toast({ variant: "destructive", title: "No file yet", description: "This record is still pending upload." });
      return;
    }
    try {
      const { data } = await api.get("/dtrs/uploads/s3-url", { params: { storageKey: key } });
      const url = data?.url;
      if (!url) throw new Error("Missing download URL");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Unable to open file",
        description: err?.response?.data?.error ?? err?.message ?? "Unexpected error",
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

      {isManager ? <StatsRow summary={summary} loading={summaryQuery.isLoading} /> : null}

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
                  <SelectItem value="ALL">All modules</SelectItem>
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
                : `Showing ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filteredDocuments.length)} of ${
                    filteredDocuments.length
                  } records (${documents.length} fetched).`}
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
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        onCopyKey={handleCopyKey}
                        onViewFile={handleViewFile}
                        onViewDetails={(id) => navigate(`/dtrs/documents/${id}`)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredDocuments.length > PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-sm text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={safePage <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadCard isManager={isManager} onSuccess={() => setPage(1)} />
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
      projectId: "",
      poId: "",
      deliveryId: "",
      assetId: "",
      woId: "",
      docTag: "",
      notes: "",
    },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const moduleValue = form.watch("module");
  const docTypes = MODULE_DOC_TYPES[moduleValue] ?? [];
  const poOptionsQuery = useProcurementPoOptions({ enabled: moduleValue === "PROCUREMENT" });
  const deliveriesQuery = usePltDeliveries({}, { enabled: moduleValue === "DELIVERY" });
  const projectsQuery = usePltProjects({}, { enabled: moduleValue === "PROJECT" });
  const assetsQuery = useAlmsAssets({ enabled: moduleValue === "ASSET" });
  const workOrdersQuery = useAlmsWorkOrders({ enabled: moduleValue === "MAINTENANCE" });
  const existingDocsQuery = useDocumentsList(
    { module: moduleValue === "OTHER" ? undefined : moduleValue },
    { enabled: moduleValue !== "OTHER" }
  );
  const existingDocs = existingDocsQuery.data ?? [];
  const docTagValue = form.watch("docTag");

  useEffect(() => {
    const keepField =
      moduleValue === "PROCUREMENT"
        ? "poId"
        : moduleValue === "DELIVERY"
        ? "deliveryId"
        : moduleValue === "PROJECT"
        ? "projectId"
        : moduleValue === "ASSET"
        ? "assetId"
        : moduleValue === "MAINTENANCE"
        ? "woId"
        : null;
    const allFields = ["poId", "deliveryId", "projectId", "assetId", "woId"] as const;
    allFields.forEach((field) => {
      if (field !== keepField) {
        form.setValue(field, "");
      }
    });
    form.setValue("docTag", "");
  }, [form, moduleValue]);

  const qc = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      let storageKey;
      let mimeType;
      let size;
      let checksum;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const { data } = await api.post("/dtrs/uploads/s3", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        storageKey = data?.storageKey;
        mimeType = data?.mimeType;
        size = data?.size;
        checksum = data?.checksum;

        if (!storageKey) {
          throw new Error("Upload failed: missing storage key");
        }
      }

      const payload: Record<string, unknown> = {
        module: values.module,
        title: values.title,
        notes: values.notes || undefined,
        ...(storageKey ? { storageKey, mimeType, size, checksum } : {}),
      };
      if (values.module === "PROCUREMENT") payload.poId = values.poId || undefined;
      if (values.module === "DELIVERY") payload.deliveryId = values.deliveryId || undefined;
      if (values.module === "PROJECT") payload.projectId = values.projectId || undefined;
      if (values.module === "ASSET") payload.assetId = values.assetId || undefined;
      if (values.module === "MAINTENANCE") payload.woId = values.woId || undefined;
      if (values.docTag) payload.tags = [values.docTag];
      await api.post("/dtrs/documents", payload);
    },
    onSuccess: () => {
      toast({ title: "Document recorded" });
      qc.invalidateQueries({ queryKey: ["dtrs", "documents"] });
      qc.invalidateQueries({ queryKey: ["dtrs", "summary"] });
      form.reset({
        module: "PROCUREMENT",
        title: "",
        projectId: "",
        poId: "",
        deliveryId: "",
        assetId: "",
        woId: "",
        docTag: "",
        notes: "",
      });
      setSelectedFile(null);
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

            <div className="grid gap-2">
              <FormLabel>Upload file (optional)</FormLabel>
              <Input
                type="file"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to record a pending document and upload the file later.
              </p>
            </div>

            <GuidedScopeFields
              moduleValue={moduleValue}
              form={form}
              existingDocs={existingDocs}
              docTag={docTagValue}
              poOptionsQuery={poOptionsQuery}
              deliveriesQuery={deliveriesQuery}
              projectsQuery={projectsQuery}
              assetsQuery={assetsQuery}
              workOrdersQuery={workOrdersQuery}
            />

            {docTypes.length ? (
              <FormField
                control={form.control}
                name="docTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {docTypes.map((docType) => (
                          <SelectItem key={docType.tag} value={docType.tag}>
                            {docType.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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

type AttachFileActionProps = {
  documentId: string;
};

function AttachFileAction({ documentId }: AttachFileActionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handlePick = () => inputRef.current?.click();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/dtrs/uploads/s3", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const storageKey = data?.storageKey;
      if (!storageKey) throw new Error("Upload failed: missing storage key");

      await api.post(`/dtrs/documents/${documentId}/versions`, {
        storageKey,
        mimeType: data?.mimeType,
        size: data?.size,
        checksum: data?.checksum,
      });

      toast({ title: "File attached" });
      qc.invalidateQueries({ queryKey: ["dtrs", "documents"] });
      qc.invalidateQueries({ queryKey: ["dtrs", "summary"] });
      qc.invalidateQueries({ queryKey: ["dtrs", "document-detail", documentId] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Attach failed",
        description: err?.response?.data?.error ?? err?.message ?? "Unexpected error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      <Button type="button" variant="outline" size="sm" onClick={handlePick} disabled={uploading}>
        {uploading ? "Uploading..." : "Attach file"}
      </Button>
    </>
  );
}

function DocumentRow({ doc, onCopyKey, onViewDetails, onViewFile }: DocumentRowProps) {
  const status = computeStatus(doc.storageKey);
  const references = useMemo(() => {
    const refs: Array<{ label: string; value: string }> = [];
    if (doc.poId) refs.push({ label: "PO", value: doc.poId });
    if (doc.projectId) refs.push({ label: "Project", value: doc.projectId });
    if (doc.receiptId) refs.push({ label: "Receipt", value: doc.receiptId });
    if (doc.deliveryId) refs.push({ label: "Delivery", value: doc.deliveryId });
    if (doc.assetId) refs.push({ label: "Equipment", value: doc.assetId });
    if (doc.woId) refs.push({ label: "Work order", value: doc.woId });
    return refs;
  }, [doc.assetId, doc.deliveryId, doc.poId, doc.projectId, doc.receiptId, doc.woId]);

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{doc.title}</span>
          <span className="text-xs text-muted-foreground">Uploader: {doc.uploaderId ?? "-"}</span>
          {doc.notes ? (
            <span className="text-xs italic text-muted-foreground">Note: {doc.notes}</span>
          ) : null}
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
          <span className="text-xs text-muted-foreground">-</span>
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
          <span className="text-xs text-muted-foreground">-</span>
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
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="align-top text-right">
        <div className="flex flex-wrap justify-end gap-2">
          {hasStoredFile(doc.storageKey) ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onViewFile(doc.storageKey)}>
              View file
            </Button>
          ) : (
            <AttachFileAction documentId={doc.id} />
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => onCopyKey(doc.storageKey)}>
            Copy key
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onViewDetails(doc.id)}>
            View details
          </Button>
        </div>
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

function GuidedScopeFields({
  moduleValue,
  form,
  existingDocs,
  docTag,
  poOptionsQuery,
  deliveriesQuery,
  projectsQuery,
  assetsQuery,
  workOrdersQuery,
}: {
  moduleValue: (typeof MODULE_OPTIONS)[number];
  form: ReturnType<typeof useForm<UploadFormValues>>;
  existingDocs: DocumentRecord[];
  docTag?: string;
  poOptionsQuery: ReturnType<typeof useProcurementPoOptions>;
  deliveriesQuery: ReturnType<typeof usePltDeliveries>;
  projectsQuery: ReturnType<typeof usePltProjects>;
  assetsQuery: ReturnType<typeof useAlmsAssets>;
  workOrdersQuery: ReturnType<typeof useAlmsWorkOrders>;
}) {
  if (moduleValue === "OTHER") {
    return (
      <Alert>
        <AlertTitle>No linked record</AlertTitle>
        <AlertDescription>Upload general documents that are not tied to a specific workflow.</AlertDescription>
      </Alert>
    );
  }

  if (moduleValue === "PROCUREMENT") {
    const allOptions = poOptionsQuery.data ?? [];
    const tagValue = docTag?.trim();
    const recordedIds = new Set(
      existingDocs
        .filter((doc) => doc.module === "PROCUREMENT" && doc.poId && (!tagValue || doc.tags.includes(tagValue)))
        .map((doc) => doc.poId as string)
    );
    const options = allOptions.filter((po) => !recordedIds.has(po.id));
    const hiddenCount = allOptions.length - options.length;
    const emptyMessage =
      !poOptionsQuery.isLoading && options.length === 0
        ? hiddenCount > 0
          ? "All purchase orders already have a recorded document."
          : "No purchase orders found."
        : null;
    return (
      <FormField
        control={form.control}
        name="poId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Purchase order</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={poOptionsQuery.isLoading ? "Loading purchase orders..." : "Select purchase order"}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.poNo} {po.vendorName ? `- ${po.vendorName}` : ""} ({po.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {emptyMessage ? <FormMessage>{emptyMessage}</FormMessage> : <FormMessage />}
            {hiddenCount > 0 ? (
              <p className="text-xs text-muted-foreground">{hiddenCount} recorded entries hidden.</p>
            ) : null}
          </FormItem>
        )}
      />
    );
  }

  if (moduleValue === "DELIVERY") {
    const allOptions = deliveriesQuery.data ?? [];
    const tagValue = docTag?.trim();
    const recordedIds = new Set(
      existingDocs
        .filter((doc) => doc.module === "DELIVERY" && doc.deliveryId && (!tagValue || doc.tags.includes(tagValue)))
        .map((doc) => doc.deliveryId as string)
    );
    const options = allOptions.filter((delivery) => !recordedIds.has(delivery.id));
    const hiddenCount = allOptions.length - options.length;
    const emptyMessage =
      !deliveriesQuery.isLoading && options.length === 0
        ? hiddenCount > 0
          ? "All deliveries already have a recorded document."
          : "No deliveries found."
        : null;
    return (
      <FormField
        control={form.control}
        name="deliveryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Delivery</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={deliveriesQuery.isLoading ? "Loading deliveries..." : "Select delivery"}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((delivery) => (
                  <SelectItem key={delivery.id} value={delivery.id}>
                    #{delivery.id} {delivery.trackingNo ? `- ${delivery.trackingNo}` : ""} ({delivery.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {emptyMessage ? <FormMessage>{emptyMessage}</FormMessage> : <FormMessage />}
            {hiddenCount > 0 ? (
              <p className="text-xs text-muted-foreground">{hiddenCount} recorded entries hidden.</p>
            ) : null}
          </FormItem>
        )}
      />
    );
  }

  if (moduleValue === "PROJECT") {
    const allOptions = projectsQuery.data ?? [];
    const tagValue = docTag?.trim();
    const recordedIds = new Set(
      existingDocs
        .filter((doc) => doc.module === "PROJECT" && doc.projectId && (!tagValue || doc.tags.includes(tagValue)))
        .map((doc) => doc.projectId as string)
    );
    const options = allOptions.filter((project) => !recordedIds.has(project.id));
    const hiddenCount = allOptions.length - options.length;
    const emptyMessage =
      !projectsQuery.isLoading && options.length === 0
        ? hiddenCount > 0
          ? "All projects already have a recorded document."
          : "No projects found."
        : null;
    return (
      <FormField
        control={form.control}
        name="projectId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Project</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={projectsQuery.isLoading ? "Loading projects..." : "Select project"}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {emptyMessage ? <FormMessage>{emptyMessage}</FormMessage> : <FormMessage />}
            {hiddenCount > 0 ? (
              <p className="text-xs text-muted-foreground">{hiddenCount} recorded entries hidden.</p>
            ) : null}
          </FormItem>
        )}
      />
    );
  }

  if (moduleValue === "ASSET") {
    const allOptions = assetsQuery.data?.rows ?? [];
    const recordedIds = new Set(
      existingDocs
        .filter((doc) => doc.module === "ASSET" && doc.assetId)
        .map((doc) => doc.assetId as string)
    );
    const options = allOptions.filter((asset) => !recordedIds.has(asset.id));
    const hiddenCount = allOptions.length - options.length;
    const emptyMessage =
      !assetsQuery.isLoading && options.length === 0
        ? hiddenCount > 0
          ? "All assets already have a recorded document."
          : "No assets found."
        : null;
    return (
      <FormField
        control={form.control}
        name="assetId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Equipment</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={assetsQuery.isLoading ? "Loading assets..." : "Select asset"}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.assetCode} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {emptyMessage ? <FormMessage>{emptyMessage}</FormMessage> : <FormMessage />}
            {hiddenCount > 0 ? (
              <p className="text-xs text-muted-foreground">{hiddenCount} recorded entries hidden.</p>
            ) : null}
          </FormItem>
        )}
      />
    );
  }

  if (moduleValue === "MAINTENANCE") {
    const allOptions = workOrdersQuery.data?.rows ?? [];
    const recordedIds = new Set(
      existingDocs
        .filter((doc) => doc.module === "MAINTENANCE" && doc.woId)
        .map((doc) => doc.woId as string)
    );
    const options = allOptions.filter((wo) => !recordedIds.has(wo.id));
    const hiddenCount = allOptions.length - options.length;
    const emptyMessage =
      !workOrdersQuery.isLoading && options.length === 0
        ? hiddenCount > 0
          ? "All work orders already have a recorded document."
          : "No work orders found."
        : null;
    return (
      <FormField
        control={form.control}
        name="woId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Work order</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={workOrdersQuery.isLoading ? "Loading work orders..." : "Select work order"}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((wo) => (
                  <SelectItem key={wo.id} value={wo.id}>
                    {wo.woNo} ({wo.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {emptyMessage ? <FormMessage>{emptyMessage}</FormMessage> : <FormMessage />}
            {hiddenCount > 0 ? (
              <p className="text-xs text-muted-foreground">{hiddenCount} recorded entries hidden.</p>
            ) : null}
          </FormItem>
        )}
      />
    );
  }

  return null;
}

