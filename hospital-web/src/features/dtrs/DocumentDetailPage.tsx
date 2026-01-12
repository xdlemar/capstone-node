import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDocumentDetail } from "@/hooks/useDocumentSearch";
import { useProcurementReceiptDetail } from "@/hooks/useProcurementReceiptDetail";
import { api } from "@/lib/api";

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();

  const query = useDocumentDetail(documentId, { enabled: Boolean(documentId) });
  const receiptId = query.data?.document?.receiptId ?? undefined;
  const isProcurementDoc = query.data?.document?.module === "PROCUREMENT";
  const receiptDetailQuery = useProcurementReceiptDetail(receiptId, {
    enabled: isProcurementDoc && Boolean(receiptId),
  });

  const references = useMemo(() => {
    const ref = query.data?.document;
    if (!ref) return [] as Array<{ label: string; value: string }>;
    const entries: Array<{ label: string; value: string }> = [];
    if (ref.poId) entries.push({ label: "PO", value: ref.poId });
    if (ref.projectId) entries.push({ label: "Project", value: ref.projectId });
    if (ref.receiptId) entries.push({ label: "Receipt", value: ref.receiptId });
    if (ref.deliveryId) entries.push({ label: "Delivery", value: ref.deliveryId });
    if (ref.assetId) entries.push({ label: "Asset", value: ref.assetId });
    if (ref.woId) entries.push({ label: "Work order", value: ref.woId });
    return entries;
  }, [query.data]);

  if (!documentId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Missing document id</AlertTitle>
        <AlertDescription>Select a document from the library to view details.</AlertDescription>
      </Alert>
    );
  }

  if (query.isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load document</AlertTitle>
        <AlertDescription>Check your permissions or try again later.</AlertDescription>
      </Alert>
    );
  }

  if (!query.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Document not found</AlertTitle>
        <AlertDescription>The document may have been removed or you do not have access.</AlertDescription>
      </Alert>
    );
  }

  const { document, tags, versions, audits } = query.data;
  const canViewFile = Boolean(document.storageKey && !document.storageKey.startsWith("placeholder:"));

  const handleViewFile = async () => {
    if (!canViewFile) {
      toast({ variant: "destructive", title: "No file yet", description: "This record is still pending upload." });
      return;
    }
    try {
      const { data } = await api.get("/dtrs/uploads/s3-url", { params: { storageKey: document.storageKey } });
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
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{document.title}</h1>
          <p className="text-muted-foreground">Detailed timeline and metadata for this document.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!canViewFile} onClick={handleViewFile}>
            {canViewFile ? "View file" : "Pending upload"}
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      <Card className="border bg-card shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle>Document metadata</CardTitle>
          <CardDescription>ID {document.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{document.module}</Badge>
            {document.notes ? <span className="text-sm text-muted-foreground">Note: {document.notes}</span> : null}
            <Badge variant="outline">Created {new Date(document.createdAt).toLocaleString()}</Badge>
            <Badge variant="outline">Updated {new Date(document.updatedAt).toLocaleString()}</Badge>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Storage key: {document.storageKey ?? "-"}</p>
            <p>Checksum: {document.checksum ?? "-"}</p>
            <p>Mime type: {document.mimeType ?? "-"}</p>
            <p>Size: {document.size ?? "-"}</p>
            <p>Uploader id: {document.uploaderId ?? "-"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">References</p>
            {references.length ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {references.map((item) => (
                  <Badge key={`${document.id}-${item.label}-${item.value}`} variant="outline">
                    {item.label}: {item.value}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No reference ids recorded.</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Tags</p>
            {tags.length ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No tags assigned.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {document.module === "PROCUREMENT" && document.receiptId ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Receipt details</CardTitle>
            <CardDescription>Structured procurement context captured at receiving.</CardDescription>
          </CardHeader>
          <CardContent>
            {receiptDetailQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : receiptDetailQuery.data ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">Purchase order</p>
                    <p className="text-foreground font-medium">
                      {receiptDetailQuery.data.po?.poNo ?? "PO unavailable"}
                    </p>
                    <p>Vendor: {receiptDetailQuery.data.po?.vendorName ?? "-"}</p>
                    <p>
                      Ordered:{" "}
                      {receiptDetailQuery.data.po?.orderedAt
                        ? new Date(receiptDetailQuery.data.po.orderedAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">Receipt</p>
                    <p>DR No: {receiptDetailQuery.data.receipt.drNo ?? "-"}</p>
                    <p>Invoice No: {receiptDetailQuery.data.receipt.invoiceNo ?? "-"}</p>
                    <p>
                      Received: {new Date(receiptDetailQuery.data.receipt.receivedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">Summary</p>
                    <p>Line items: {receiptDetailQuery.data.totals.lineCount}</p>
                    <p>Total qty: {receiptDetailQuery.data.totals.totalQty}</p>
                  </div>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiptDetailQuery.data.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.itemName ?? `Item #${line.itemId}`}</TableCell>
                          <TableCell className="text-muted-foreground">{line.itemSku ?? "-"}</TableCell>
                          <TableCell className="text-right">{line.qty}</TableCell>
                          <TableCell>{line.unit ?? "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Receipt details unavailable</AlertTitle>
                <AlertDescription>We could not load the receipt summary for this document.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Versions</CardTitle>
          <CardDescription>Latest version first.</CardDescription>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No version history yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Storage key</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Checksum</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell>{version.versionNo}</TableCell>
                      <TableCell className="font-mono text-xs">{version.storageKey}</TableCell>
                      <TableCell>{version.size ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{version.checksum ?? "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(version.createdAt).toLocaleString()}
                      </TableCell>
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
