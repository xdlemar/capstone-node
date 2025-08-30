import { create } from "zustand";

const persistKey = "auth_user";

export const useAuthStore = create((set, get) => ({
  user: null,          // { id, name, email, role }
  token: null,         // jwt
  login: ({ user, token }) => {
    localStorage.setItem("token", token);
    localStorage.setItem(persistKey, JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem(persistKey);
    set({ user: null, token: null });
  },
  hydrate: () => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem(persistKey);
    if (token && u) set({ token, user: JSON.parse(u) });
  }
}));
