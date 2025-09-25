import { jwtDecode } from "jwt-decode";

type TokenPayload = {
  sub?: string | number;
  roles?: string[];
  exp?: number;
};

type DecodedUser = {
  id: string;
  roles: string[];
};

const STORAGE_KEY = "token";

function normalizeToken(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
}

function decode(token: string | null): TokenPayload | null {
  if (!token) return null;
  try {
    return jwtDecode<TokenPayload>(token);
  } catch (err) {
    console.warn("[auth] failed to decode token", err);
    return null;
  }
}

function isExpired(payload: TokenPayload | null) {
  if (!payload?.exp) return false;
  return payload.exp * 1000 < Date.now();
}

function buildUser(payload: TokenPayload | null): DecodedUser | null {
  if (!payload || isExpired(payload)) return null;
  if (!payload.sub) return null;
  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  return { id: String(payload.sub), roles };
}

export const auth = {
  set(token: string) {
    if (typeof window === "undefined") return;
    const normalized = normalizeToken(token);
    if (!normalized) {
      this.clear();
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, normalized);
  },
  get() {
    if (typeof window === "undefined") return null;
    return normalizeToken(window.localStorage.getItem(STORAGE_KEY));
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
  isAuthed() {
    const payload = decode(this.get());
    return !!buildUser(payload);
  },
  getUser(): DecodedUser | null {
    return buildUser(decode(this.get()));
  },
  hasRole(...roles: string[]) {
    if (!roles.length) return true;
    const user = this.getUser();
    if (!user) return false;
    return roles.some((role) => user.roles.includes(role));
  },
};

export type { DecodedUser };
