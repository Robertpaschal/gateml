"use client";

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "ANALYST";

export interface TokenPayload {
  sub:     string;
  email:   string;
  role:    AdminRole;
  isAdmin: boolean;
  tv:      number;
  exp:     number;
}

function decodeJwt(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split(".");
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as TokenPayload;
  } catch {
    return null;
  }
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function getAdminRole(): AdminRole | null {
  const token = getAdminToken();
  if (!token) return null;
  return decodeJwt(token)?.role ?? null;
}

export function getAdminPayload(): TokenPayload | null {
  const token = getAdminToken();
  if (!token) return null;
  return decodeJwt(token);
}

export function hasRole(...roles: AdminRole[]): boolean {
  const role = getAdminRole();
  return role !== null && roles.includes(role);
}

export function setAdminSession(token: string): void {
  document.cookie = `admin_token=${token}; path=/; max-age=43200; SameSite=Lax`;
  localStorage.setItem("admin_token", token);
}

export function clearAdminSession(): void {
  document.cookie = "admin_token=; path=/; max-age=0";
  localStorage.removeItem("admin_token");
}
