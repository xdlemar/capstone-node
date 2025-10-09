import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

const QUERY_KEY = ["admin", "users"];

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<AdminUser[]>("/auth/admin/users");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export type CreateAdminUserPayload = {
  email: string;
  name: string;
  password: string;
  roles: string[];
  isActive?: boolean;
};

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAdminUserPayload) => {
      const { data } = await api.post<AdminUser>("/auth/admin/users", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export type UpdateAdminUserPayload = {
  id: string;
  email?: string;
  name?: string;
  password?: string;
  roles?: string[];
  isActive?: boolean;
};

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateAdminUserPayload) => {
      const { data } = await api.patch<AdminUser>(`/auth/admin/users/${id}`, rest);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDisableAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<AdminUser>(`/auth/admin/users/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
