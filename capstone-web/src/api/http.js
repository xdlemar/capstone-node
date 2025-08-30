import axios from "axios";

export const auth = axios.create({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

export const inv = axios.create({
  baseURL: import.meta.env.VITE_INV_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

export const prc = axios.create({
  baseURL: import.meta.env.VITE_PRC_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

// attach JWT if present
function attachToken(config){
  const raw = localStorage.getItem("capstone_user");
  if (raw) {
    try {
      const { token } = JSON.parse(raw);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  return config;
}
inv.interceptors.request.use(attachToken);
prc.interceptors.request.use(attachToken);
