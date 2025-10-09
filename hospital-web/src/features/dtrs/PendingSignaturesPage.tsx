import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingSignatures } from "@/hooks/useDocumentSearch";
import { useNavigate } from "react-router-dom";

export default function PendingSignaturesPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");
  const navigate = useNavigate();
  const query = usePendingSignatures({ enabled: isManager });

  const records = query.data ?? [];
  const totalPending = useMemo(() => records.reduce((sum, doc) => sum + doc.pendingSignatures.length, 0), [records]);

  if (!isManager) {
    return (
      <Alert className="border-dashed border-destructive/40 bg-destructive/5">
        <AlertTitle>Restricted area</AlertTitle>
        <AlertDescription>Only managers and administrators can review pending signatures.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Pending signatures</h1>
        <p className="text-muted-foreground max-w-3xl">
          Track documents that still need signed artefacts or final uploads before close-out.
        </p>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>{`You have ${records.length} document${records.length === 1 ? "" : "s"} waiting on ${totalPending} signature${totalPending === 1 ? "" : "s"}.`}</CardDescription>
        </CardHeader>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Documents awaiting signatures</CardTitle>
          <CardDescription>Click a row to inspect details, upload revisions, or log access.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <Skeleton className="h-48" />
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground">All signatures are complete.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Last update</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{doc.title}</span>
                          {doc.notes ? (
                            <span className="text-xs text-muted-foreground">Note: {doc.notes}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.module}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{doc.pendingSignatures.length}</Badge>
                      </TableCell>
                      <TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(doc.updatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/dtrs/documents/${doc.id}`)}>
                          View details
                        </Button>
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
