import { auth } from "./http";

export const login = (email, password) => auth.post("/auth/login", { email, password });
export const me    = () => auth.get("/auth/me");
