import axios from "axios";

const token = () => localStorage.getItem("token");

function withAuth(instance) {
  instance.interceptors.request.use(cfg => {
    const t = token();
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
  });
  return instance;
}

export const auth = axios.create({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

export const inv  = withAuth(axios.create({
  baseURL: import.meta.env.VITE_INV_BASE_URL,
  headers: { "Content-Type": "application/json" }
}));

export const prc  = withAuth(axios.create({
  baseURL: import.meta.env.VITE_PRC_BASE_URL,
  headers: { "Content-Type": "application/json" }
}));

export const alms = withAuth(axios.create({
  baseURL: import.meta.env.VITE_ALMS_BASE_URL,
  headers: { "Content-Type": "application/json" }
}));

export const dtrs = withAuth(axios.create({
  baseURL: import.meta.env.VITE_DTRS_BASE_URL,
  headers: { "Content-Type": "application/json" }
}));

export const plt  = withAuth(axios.create({
  baseURL: import.meta.env.VITE_PLT_BASE_URL,
  headers: { "Content-Type": "application/json" }
}));
