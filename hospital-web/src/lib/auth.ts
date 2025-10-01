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
let inMemoryToken: string | null = null;
let migratedLegacyStorage = false;

function normalizeToken(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch (err) {
    console.warn("[auth] sessionStorage unavailable", err);
    return null;
  }
}

function migrateLegacyLocalStorage(): string | null {
  if (typeof window === "undefined" || migratedLegacyStorage) return null;
  migratedLegacyStorage = true;
  try {
    const legacy = window.localStorage.getItem(STORAGE_KEY);
    if (!legacy) return null;
    window.localStorage.removeItem(STORAGE_KEY);
    return normalizeToken(legacy);
  } catch (err) {
    console.warn("[auth] failed to access legacy localStorage", err);
    return null;
  }
}

function persistToken(token: string | null) {
  inMemoryToken = token;
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    if (token) {
      storage.setItem(STORAGE_KEY, token);
    } else {
      storage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn("[auth] failed to persist token", err);
  }
}

function hydrateToken(): string | null {
  if (inMemoryToken) return inMemoryToken;

  const storage = getSessionStorage();
  if (storage) {
    try {
      const stored = storage.getItem(STORAGE_KEY);
      inMemoryToken = normalizeToken(stored);
      if (inMemoryToken) {
        return inMemoryToken;
      }
    } catch (err) {
      console.warn("[auth] failed to read sessionStorage", err);
    }
  }

  const legacyToken = migrateLegacyLocalStorage();
  if (legacyToken) {
    persistToken(legacyToken);
    return inMemoryToken;
  }

  return null;
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
    persistToken(normalized);
  },
  get() {
    if (typeof window === "undefined") return null;
    return hydrateToken();
  },
  clear() {
    if (typeof window === "undefined") return;
    persistToken(null);
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
