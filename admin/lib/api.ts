const BASE = "/api";

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function req<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AdminProfile {
  id: string; email: string; name: string; role: string;
  createdAt: string; lastLoginAt: string | null;
}

export const adminAuthApi = {
  login: (email: string, password: string) =>
    req<{ token: string; admin: AdminProfile }>("/admin/auth/login", {
      method: "POST",
      body:   JSON.stringify({ email, password }),
    }),
  me: (token: string) => req<AdminProfile>("/admin/auth/me", {}, token),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface Analytics {
  totalUsers: number;
  planCounts: Record<string, number>;
  requestsToday: number;
  requestsThisMonth: number;
  newSignupsThisWeek: number;
  activeSubscriptions: number;
  mrrUsd: number;
  topUsersByUsage: Array<{
    userId: string; requests: number;
    user: { email: string; name: string | null; plan: string };
  }>;
}

export const analyticsApi = {
  get: (token: string) => req<Analytics>("/admin/analytics", {}, token),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string; email: string; name: string | null; plan: string;
  provider: string; createdAt: string; stripeCustomerId: string | null;
  payAsYouGo: boolean; usageThisMonth: number;
  subscription: { status: string; currentPeriodEnd: string } | null;
  _count: { requestLogs: number };
}

export interface AdminUserDetail {
  user: AdminUserRow & {
    apiKeys: Array<{ id: string; name: string; keyPrefix: string; type: string; createdAt: string; lastUsedAt: string | null }>;
    usageRecords: Array<{ month: string; requests: number }>;
    _count: { requestLogs: number; prompts: number };
  };
  logs: Array<{ id: string; model: string; provider: string; status: number; latencyMs: number; costUsd: number; isTestMode: boolean; createdAt: string }>;
  usageThisMonth: number;
}

export const adminUsersApi = {
  list: (token: string, search?: string, page = 1) =>
    req<{ users: AdminUserRow[]; total: number; pages: number }>(
      `/admin/users?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      {}, token,
    ),
  get: (token: string, id: string) =>
    req<AdminUserDetail>(`/admin/users/${id}`, {}, token),
  updatePlan: (token: string, id: string, plan: string) =>
    req<{ id: string; plan: string }>(`/admin/users/${id}/plan`, {
      method: "PATCH", body: JSON.stringify({ plan }),
    }, token),
};

// ── Messages ──────────────────────────────────────────────────────────────────

export interface SupportMessage {
  id: string; email: string; name: string; company: string | null;
  subject: string; body: string; category: string; status: string;
  replyBody: string | null; repliedAt: string | null; createdAt: string;
  user: { id: string; email: string; plan: string } | null;
}

export const messagesApi = {
  list: (token: string, status?: string, category?: string, page = 1) =>
    req<{ messages: SupportMessage[]; total: number; pages: number }>(
      `/admin/messages?page=${page}${status ? `&status=${status}` : ""}${category ? `&category=${category}` : ""}`,
      {}, token,
    ),
  get: (token: string, id: string) =>
    req<SupportMessage>(`/admin/messages/${id}`, {}, token),
  reply: (token: string, id: string, body: string) =>
    req<SupportMessage>(`/admin/messages/${id}/reply`, {
      method: "PATCH", body: JSON.stringify({ body }),
    }, token),
  updateStatus: (token: string, id: string, status: string) =>
    req<SupportMessage>(`/admin/messages/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }, token),
};

// ── System / Changelog ────────────────────────────────────────────────────────

export const systemApi = {
  setStatus: (token: string, operational: boolean, message: string, affectedServices: string[] = []) =>
    req<void>("/system/status", {
      method: "POST", body: JSON.stringify({ operational, message, affectedServices }),
    }, token),
  upsertChangelog: (
    token: string,
    entry: { id: string; version: string; date: string; title: string; tag: string; changes: string[]; order: number },
  ) =>
    req<void>("/system/changelog", { method: "POST", body: JSON.stringify(entry) }, token),
};
