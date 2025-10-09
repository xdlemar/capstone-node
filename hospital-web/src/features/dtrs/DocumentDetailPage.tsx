import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDocumentDetail } from "@/hooks/useDocumentSearch";

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id ?? "";
  const navigate = useNavigate();

  const query = useDocumentDetail(documentId, { enabled: Boolean(documentId) });

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

  const { document, tags, versions, signatures, audits } = query.data;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{document.title}</h1>
          <p className="text-muted-foreground">Detailed timeline and metadata for this document.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
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

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Signatures</CardTitle>
          <CardDescription>Pending signatures are highlighted in red.</CardDescription>
        </CardHeader>
        <CardContent>
          {signatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signatures logged.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Signer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Signed at</TableHead>
                    <TableHead>Storage key</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signatures.map((sig) => (
                    <TableRow key={sig.id} className={!sig.storageKey ? "bg-destructive/5" : undefined}>
                      <TableCell>{sig.signerId ?? "-"}</TableCell>
                      <TableCell>{sig.method}</TableCell>
                      <TableCell>{new Date(sig.signedAt).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{sig.storageKey ?? "-"}</TableCell>
                      <TableCell>{sig.ip ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Access audit</CardTitle>
          <CardDescription>Last 200 events.</CardDescription>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>User agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>{entry.userId ?? "-"}</TableCell>
                      <TableCell>{new Date(entry.occurredAt).toLocaleString()}</TableCell>
                      <TableCell>{entry.ip ?? "-"}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                        {entry.userAgent ?? "-"}
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
