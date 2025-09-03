
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export default function useAuth() {
  const { user, token, login, logout, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  return { user, token, login, logout };
}
