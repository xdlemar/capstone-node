import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type DocumentSearchParams = {
  q?: string;
  module?: string;
};

export type DocumentSearchResult = {
  id: string;
  title: string;
  module: string;
  createdAt: string;
  uploaderId: string | null;
  storageKey: string | null;
  tags: string[];
};

export function useDocumentSearch(params: DocumentSearchParams) {
  return useQuery<DocumentSearchResult[]>({
    queryKey: ["dtrs", "search", params],
    queryFn: async () => {
      const { data } = await api.get("/dtrs/documents", {
        params: {
          q: params.q,
          module: params.module,
          take: 50,
        },
      });

      return Array.isArray(data)
        ? data.map((doc: any) => ({
            id: doc.id?.toString() ?? "",
            title: doc.title,
            module: doc.module,
            createdAt: doc.createdAt,
            uploaderId: doc.uploaderId ?? null,
            storageKey: doc.storageKey ?? null,
            tags: Array.isArray(doc.tags) ? doc.tags.map((t: any) => t.name || t) : [],
          }))
        : [];
    },
    enabled: Boolean(params.q) && (params.q?.trim().length ?? 0) > 1,
  });
}

