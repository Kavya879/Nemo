/**
 * Lightweight client session — simulates distinct logins (buyer vs seller, etc.)
 * without real auth yet. The current user lives in localStorage; api-client reads
 * it at request time so per-user data (orders, credits, returns) is scoped.
 *
 * This is a deliberate placeholder for real auth (Google sign-in, etc.) — the
 * userId boundary is already threaded end to end, so swapping in real auth later
 * is a drop-in.
 */

export interface SessionUser {
  id: string;
  name: string;
  role: "owner" | "buyer" | "admin";
}

const KEY = "reloop-user-v1";

/** The seeded demo data (orders, the starter listing) belongs to this account. */
export const DEFAULT_USER: SessionUser = {
  id: "demo-user",
  name: "Demo Owner",
  role: "owner",
};

/** Quick-switch demo accounts so the parties can be simulated immediately. */
export const PRESET_USERS: SessionUser[] = [
  DEFAULT_USER,
  { id: "buyer-asha", name: "Asha", role: "buyer" },
  { id: "buyer-ravi", name: "Ravi", role: "buyer" },
  { id: "admin-ops", name: "Ops Admin", role: "admin" },
];

export function isAdmin(user: SessionUser): boolean {
  return user.role === "admin";
}

export function getCurrentUser(): SessionUser {
  if (typeof window === "undefined") return DEFAULT_USER;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as SessionUser;
  } catch {
    /* ignore */
  }
  return DEFAULT_USER;
}

export function setCurrentUser(user: SessionUser): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

/** Used by api-client to scope requests to the signed-in user. */
export function currentUserId(): string {
  return getCurrentUser().id;
}

/** Turns a free-text name into a stable user id. */
export function slugUserId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `user-${slug || "guest"}`;
}
