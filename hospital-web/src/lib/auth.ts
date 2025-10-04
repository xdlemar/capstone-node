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

function normalizeToken(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
}

function getStorage(kind: "session" | "local"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch (err) {
    console.warn(`[auth] ${kind}Storage unavailable`, err);
    return null;
  }
}

function writeToken(storage: Storage | null, token: string | null, kind: "session" | "local") {
  if (!storage) return;
  try {
    if (token) {
      storage.setItem(STORAGE_KEY, token);
    } else {
      storage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn(`[auth] failed to persist ${kind}Storage token`, err);
  }
}

function readToken(storage: Storage | null, kind: "session" | "local"): string | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return normalizeToken(raw);
  } catch (err) {
    console.warn(`[auth] failed to read ${kind}Storage`, err);
    return null;
  }
}

function persistToken(token: string | null) {
  inMemoryToken = token;
  const storages: Array<["session" | "local", Storage | null]> = [
    ["session", getStorage("session")],
    ["local", getStorage("local")],
  ];
  for (const [kind, storage] of storages) {
    writeToken(storage, token, kind);
  }
}

function hydrateToken(): string | null {
  if (inMemoryToken) return inMemoryToken;

  const sessionToken = readToken(getStorage("session"), "session");
  if (sessionToken) {
    inMemoryToken = sessionToken;
    return inMemoryToken;
  }

  const localToken = readToken(getStorage("local"), "local");
  if (localToken) {
    persistToken(localToken);
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

export const TOKEN_STORAGE_KEY = STORAGE_KEY;

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
