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
  notes: string | null;
};

export type DocumentRecord = DocumentSearchResult & {
  poId?: string | null;
  projectId?: string | null;
  receiptId?: string | null;
  deliveryId?: string | null;
  assetId?: string | null;
  woId?: string | null;
};

export type DocumentListFilters = {
  module?: string;
  projectId?: string;
  poId?: string;
  receiptId?: string;
  deliveryId?: string;
  assetId?: string;
  woId?: string;
  q?: string;
};

export type MissingDocumentReport = {
  module: string;
  scopeField: string;
  scopeId: string;
  required: Array<{ code: string; tag: string; label: string }>;
  missing: Array<{ code: string; tag: string; label: string }>;
  present: Array<{
    id: string;
    title: string;
    tags: string[];
    storageKey: string | null;
    createdAt: string;
  }>;
};

const MODULE_SCOPE_PARAM: Record<string, string> = {
  PROCUREMENT: "poId",
  PROJECT: "projectId",
  DELIVERY: "deliveryId",
  ASSET: "assetId",
  MAINTENANCE: "woId",
};

function mapDocument(doc: any): DocumentRecord {
  return {
    id: doc.id?.toString() ?? "",
    title: doc.title,
    module: doc.module,
    createdAt: doc.createdAt,
    uploaderId: doc.uploaderId ? doc.uploaderId.toString() : null,
    storageKey: doc.storageKey ?? null,
    tags: Array.isArray(doc.tags) ? doc.tags.map((t: any) => t.name || t) : [],
    notes: doc.notes ?? null,
    poId: doc.poId ? doc.poId.toString() : null,
    projectId: doc.projectId ? doc.projectId.toString() : null,
    receiptId: doc.receiptId ? doc.receiptId.toString() : null,
    deliveryId: doc.deliveryId ? doc.deliveryId.toString() : null,
    assetId: doc.assetId ? doc.assetId.toString() : null,
    woId: doc.woId ? doc.woId.toString() : null,
  };
}

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

      return Array.isArray(data) ? data.map(mapDocument) : [];
    },
    enabled: Boolean(params.q) && (params.q?.trim().length ?? 0) > 1,
  });
}

export function useDocumentsList(filters: DocumentListFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery<DocumentRecord[]>({
    queryKey: ["dtrs", "documents", filters],
    queryFn: async () => {
      const { data } = await api.get("/dtrs/documents", {
        params: {
          module: filters.module,
          projectId: filters.projectId,
          poId: filters.poId,
          receiptId: filters.receiptId,
          deliveryId: filters.deliveryId,
          assetId: filters.assetId,
          woId: filters.woId,
          q: filters.q,
          take: 100,
        },
      });

      return Array.isArray(data) ? data.map(mapDocument) : [];
    },
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}

export function useMissingDocumentsReport(
  params: { module?: string; scopeId?: string },
  options: { enabled?: boolean } = {}
) {
  const module = params.module?.toUpperCase() ?? "";
  const scopeField = MODULE_SCOPE_PARAM[module];
  const scopeId = params.scopeId?.trim();
  const enabled = options.enabled ?? Boolean(module && scopeField && scopeId);

  return useQuery<MissingDocumentReport | null>({
    queryKey: ["dtrs", "missing", module, scopeId],
    enabled,
    queryFn: async () => {
      if (!module || !scopeField || !scopeId) return null;
      const { data } = await api.get("/dtrs/documents/reports/missing", {
        params: { module, [scopeField]: scopeId },
      });
      if (!data) return null;
      return {
        module: data.module,
        scopeField: data.scopeField,
        scopeId: data.scopeId,
        required: Array.isArray(data.required) ? data.required : [],
        missing: Array.isArray(data.missing) ? data.missing : [],
        present: Array.isArray(data.present)
          ? data.present.map((doc: any) => ({
              id: doc.id?.toString() ?? "",
              title: doc.title,
              tags: Array.isArray(doc.tags) ? doc.tags : [],
              storageKey: doc.storageKey ?? null,
              createdAt: doc.createdAt,
            }))
          : [],
      };
    },
    staleTime: 60_000,
  });
}

export type PendingSignatureRecord = {
  id: string;
  title: string;
  module: string;
  notes: string | null;
  storageKey: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  poId: string | null;
  receiptId: string | null;
  deliveryId: string | null;
  assetId: string | null;
  woId: string | null;
  tags: string[];
  pendingSignatures: Array<{
    id: string;
    signerId: string | null;
    method: string;
    signedAt: string;
    storageKey: string | null;
    ip: string | null;
  }>;
};

export type DocumentDetailResponse = {
  document: {
    id: string;
    title: string;
    module: string;
    notes: string | null;
    storageKey: string | null;
    mimeType: string | null;
    size: number | null;
    checksum: string | null;
    uploaderId: string | null;
    projectId: string | null;
    poId: string | null;
    receiptId: string | null;
    deliveryId: string | null;
    assetId: string | null;
    woId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  tags: Array<{ id: string; name: string }>;
  versions: Array<{
    id: string;
    versionNo: number;
    storageKey: string;
    size: number | null;
    checksum: string | null;
    createdAt: string;
    createdById: string | null;
  }>;
  signatures: Array<{
    id: string;
    signerId: string | null;
    method: string;
    signedAt: string;
    storageKey: string | null;
    ip: string | null;
  }>;
  audits: Array<{
    id: string;
    action: string;
    occurredAt: string;
    userId: string | null;
    ip: string | null;
    userAgent: string | null;
  }>;
};

export function usePendingSignatures(options: { enabled?: boolean } = {}) {
  return useQuery<PendingSignatureRecord[]>({
    queryKey: ["dtrs", "pending-signatures"],
    queryFn: async () => {
      const { data } = await api.get<PendingSignatureRecord[]>("/dtrs/documents/pending-signatures");
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}

export function useDocumentDetail(id?: string, options: { enabled?: boolean } = {}) {
  return useQuery<DocumentDetailResponse | null>({
    queryKey: ["dtrs", "document-detail", id],
    enabled: options.enabled ?? Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get<DocumentDetailResponse>(`/dtrs/documents/${id}/detail`);
      return data;
    },
    staleTime: 15_000,
  });
}


