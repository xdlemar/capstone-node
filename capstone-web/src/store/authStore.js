import { create } from "zustand";

const key = "capstone_user";
const saved = (() => {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
})();

export const useAuthStore = create((set)=>({
  user: saved, // { token, user:{id,name,email,role} }
  login: (payload) => {
    localStorage.setItem(key, JSON.stringify(payload));
    set({ user: payload });
  },
  logout: () => {
    localStorage.removeItem(key);
    set({ user: null });
  }
}));
