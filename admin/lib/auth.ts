"use client";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function setAdminSession(token: string): void {
  document.cookie = `admin_token=${token}; path=/; max-age=43200; SameSite=Lax`;
  localStorage.setItem("admin_token", token);
}

export function clearAdminSession(): void {
  document.cookie = "admin_token=; path=/; max-age=0";
  localStorage.removeItem("admin_token");
}
