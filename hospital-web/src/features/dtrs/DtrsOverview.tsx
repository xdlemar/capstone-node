import { useDeferredValue, useMemo, useState } from "react";
import { AlertCircle, FileText, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDocumentSearch } from "@/hooks/useDocumentSearch";
import { useDocumentSummary } from "@/hooks/useDocumentSummary";

export default function DtrsOverview() {
  const summary = useDocumentSummary();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const searchParams = useMemo(() => ({ q: deferredQuery.length > 1 ? deferredQuery : undefined }), [deferredQuery]);
  const search = useDocumentSearch(searchParams);

  const awaiting = summary.data?.awaitingSignatures ?? 0;
  const incomplete = summary.data?.incompleteDocuments ?? [];
  const showResults = Boolean(searchParams.q);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Document tracking</h1>
        <p className="text-muted-foreground max-w-3xl">
          Upload delivery receipts, invoices, and compliance paperwork, then keep signatures and retention policies up to date.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <Card className="border bg-card">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Search documents</CardTitle>
              <CardDescription>Find receipts, invoices, and supporting files by title or tag.</CardDescription>
            </div>
            <Badge variant="outline" className="self-start text-xs">Awaiting signature: {awaiting}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                autoComplete="off"
                placeholder="Search by title, tag, or module keyword"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10"
              />
              <Button type="button" variant="secondary" className="sm:w-32">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>

            {showResults ? (
              search.isLoading ? (
                <Skeleton className="h-32" />
              ) : search.error ? (
                <Alert variant="destructive">
                  <AlertTitle>Search failed</AlertTitle>
                  <AlertDescription>Unable to load document results.</AlertDescription>
                </Alert>
              ) : search.data && search.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {search.data.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>{doc.module}</TableCell>
                          <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {doc.tags.length ? (
                              <div className="flex flex-wrap gap-1">
                                {doc.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No tags</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents matched "{searchParams.q}".</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Type at least two characters to search.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardHeader className="flex items-start gap-3">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Documents awaiting action</CardTitle>
              <CardDescription>Files that need updated signatures or re-uploads.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <Skeleton className="h-24" />
            ) : summary.error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load summary</AlertTitle>
                <AlertDescription>Try refreshing the page.</AlertDescription>
              </Alert>
            ) : incomplete.length === 0 ? (
              <p className="text-sm text-muted-foreground">All tracked documents are complete.</p>
            ) : (
              <ul className="space-y-3">
                {incomplete.map((doc) => (
                  <li key={doc.id} className="rounded-lg border border-dashed p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">Module: {doc.module}</p>
                        <p className="text-xs text-muted-foreground">Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
                        <div className="flex flex-wrap gap-1">
                          {doc.pendingSignatures.map((sig) => (
                            <Badge key={sig.id} variant="outline" className="text-xs">
                              {sig.method.toLowerCase()} pending
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

