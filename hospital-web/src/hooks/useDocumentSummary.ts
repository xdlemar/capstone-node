import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type DocumentSummary = {
  totalDocuments: number;
  recentUploads: number;
  awaitingSignatures: number;
  recentDocs: Array<{
    id: string;
    title: string;
    module: string;
    createdAt: string;
  }>;
  incompleteDocuments: Array<{
    id: string;
    title: string;
    module: string;
    createdAt: string;
    pendingSignatures: Array<{
      id: string;
      method: string;
      signedAt: string | null;
    }>;
  }>;
};

export function useDocumentSummary(options: { enabled?: boolean } = {}) {
  return useQuery<DocumentSummary>({
    queryKey: ["dtrs", "summary"],
    queryFn: async () => {
      const { data } = await api.get<DocumentSummary>("/dtrs/dashboard/summary");
      return data;
    },
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}

