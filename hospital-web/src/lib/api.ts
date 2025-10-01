import axios from "axios";

import { auth } from "@/lib/auth";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((cfg) => {
  const token = auth.get();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});
