import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  docScopes?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const PROFILE_QUERY_KEY = ["profile", "me"];

export function useProfile(options: { enabled?: boolean } = {}) {
  return useQuery<UserProfile>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<UserProfile>("/auth/me");
      return data;
    },
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}

export type UpdateProfilePayload = {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
};

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data } = await api.patch<{ user: UserProfile; access_token?: string }>("/auth/me", payload);
      return data;
    },
    onSuccess: (data) => {
      if (data?.access_token) {
        login(data.access_token);
      } else {
        qc.invalidateQueries({ queryKey: ["auth"] });
      }
      qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
