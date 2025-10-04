import { useDeferredValue, useMemo, useState } from "react";
import { AlertCircle, FileText } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentSearch, type DocumentSearchResult } from "@/hooks/useDocumentSearch";
import { useDocumentSummary } from "@/hooks/useDocumentSummary";

const SEARCH_SORT_OPTIONS = [
  { value: "created-desc", label: "Newest first" },
  { value: "created-asc", label: "Oldest first" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
] as const;

type SearchSort = (typeof SEARCH_SORT_OPTIONS)[number]["value"];

type HighestRole = "ADMIN" | "MANAGER" | "STAFF";

function getHighestRole(roles: string[]): HighestRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("MANAGER")) return "MANAGER";
  return "STAFF";
}

function sortResults(results: DocumentSearchResult[], sortBy: SearchSort) {
  const sorted = [...results];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "created-asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "created-desc":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  return sorted;
}

export default function DtrsOverview() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const highestRole = getHighestRole(roles);

  const summaryQuery = useDocumentSummary();
  const awaitingCount = summaryQuery.data?.awaitingSignatures ?? 0;
  const incomplete = summaryQuery.data?.incompleteDocuments ?? [];
  const totalDocuments = summaryQuery.data?.totalDocuments ?? 0;
  const recentUploads = summaryQuery.data?.recentUploads ?? 0;

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SearchSort>("created-desc");
  const deferredQuery = useDeferredValue(query.trim());
  const searchParams = useMemo(
    () => ({ q: deferredQuery.length > 1 ? deferredQuery : undefined }),
    [deferredQuery]
  );
  const search = useDocumentSearch(searchParams);
  const showResults = Boolean(searchParams.q);
  const searchResults = useMemo(() => {
    if (!search.data) return [] as DocumentSearchResult[];
    return sortResults(search.data, sortBy);
  }, [search.data, sortBy]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Document tracking</h1>
        <p className="text-muted-foreground max-w-3xl">
          Monitor compliance documents, signature status, and missing artefacts across Logistics 1.
        </p>
      </header>

      <Alert className="border-primary/50 bg-primary/5">
        <AlertTitle>Signed in as {highestRole}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <span>
            Staff can search and upload evidence, while managers and admins unlock dashboard analytics and missing-document reports.
          </span>
          <Badge variant="secondary">Awaiting signatures: {awaitingCount}</Badge>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total documents" value={totalDocuments} />
        <StatCard label="Uploads (7 days)" value={recentUploads} />
        <StatCard
          label="Pending signatures"
          value={awaitingCount}
          tone={awaitingCount ? "alert" : "ok"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <Card className="border bg-card">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Search library</CardTitle>
              <CardDescription>Find receipts, invoices, and approvals by title, tag, or module keyword.</CardDescription>
            </div>
            <Select value={sortBy} onValueChange={(value: SearchSort) => setSortBy(value)}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              autoComplete="off"
              placeholder="Search by title, tag, or module (min. 2 characters)"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            {showResults ? (
              search.isLoading ? (
                <Skeleton className="h-32" />
              ) : search.error ? (
                <Alert variant="destructive">
                  <AlertTitle>Search failed</AlertTitle>
                  <AlertDescription>Unable to load document results. Try again shortly.</AlertDescription>
                </Alert>
              ) : searchResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead className="w-40">Created</TableHead>
                        <TableHead>Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>{doc.module}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(doc.createdAt).toLocaleString()}
                          </TableCell>
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
              <p className="text-sm text-muted-foreground">Enter at least two characters to start searching the archive.</p>
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
              <CardDescription>Signatures or re-uploads needed to finalise compliance.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <Skeleton className="h-24" />
            ) : summaryQuery.error ? (
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
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(doc.createdAt).toLocaleString()}
                        </p>
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

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "alert" | "ok";
}) {
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
