// zustand store – plain JS (no JSX)
import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,

  hydrate() {
    try {
      const t = localStorage.getItem("token");
      const u = localStorage.getItem("user");
      if (t && u) set({ token: t, user: JSON.parse(u) });
    } catch {}
  },

  async login(email, password) {
    const res = await fetch(import.meta.env.VITE_AUTH_BASE_URL + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  }
}));
