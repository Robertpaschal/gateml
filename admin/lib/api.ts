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

// ── CRM Notes ─────────────────────────────────────────────────────────────────

export interface AdminNote {
  id: string; userId: string; adminId: string; body: string; createdAt: string;
  admin: { email: string; name: string };
}

export const notesApi = {
  list:   (token: string, userId: string) =>
    req<AdminNote[]>(`/admin/users/${userId}/notes`, {}, token),
  add:    (token: string, userId: string, body: string) =>
    req<AdminNote>(`/admin/users/${userId}/notes`, { method: "POST", body: JSON.stringify({ body }) }, token),
  delete: (token: string, userId: string, noteId: string) =>
    req<void>(`/admin/users/${userId}/notes/${noteId}`, { method: "DELETE" }, token),
};

// ── Admin Email ───────────────────────────────────────────────────────────────

export const adminEmailApi = {
  send: (token: string, userId: string, subject: string, body: string) =>
    req<{ sent: boolean; to: string }>(`/admin/users/${userId}/email`, {
      method: "POST", body: JSON.stringify({ subject, body }),
    }, token),
};

// ── Campaigns ─────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string; title: string; subject: string; body: string; target: string;
  status: string; scheduledAt: string | null; sentAt: string | null;
  sentCount: number; failedCount: number; createdAt: string;
  admin: { email: string; name: string } | null;
}

export const campaignsApi = {
  list: (token: string, page = 1) =>
    req<{ campaigns: Campaign[]; total: number; pages: number }>(`/admin/campaigns?page=${page}`, {}, token),
  get: (token: string, id: string) => req<Campaign>(`/admin/campaigns/${id}`, {}, token),
  create: (token: string, data: { title: string; subject: string; body: string; target: string; scheduledAt?: string }) =>
    req<Campaign>("/admin/campaigns", { method: "POST", body: JSON.stringify(data) }, token),
  update: (token: string, id: string, data: Partial<{ title: string; subject: string; body: string; target: string }>) =>
    req<Campaign>(`/admin/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),
  delete: (token: string, id: string) => req<void>(`/admin/campaigns/${id}`, { method: "DELETE" }, token),
  send:   (token: string, id: string) =>
    req<{ queued: number }>(`/admin/campaigns/${id}/send`, { method: "POST", body: "{}" }, token),
};

// ── Promo Codes ───────────────────────────────────────────────────────────────

export interface PromoCode {
  id: string; code: string; description: string | null; discountPercent: number;
  maxUses: number | null; usedCount: number; validFrom: string; validUntil: string | null;
  isActive: boolean; createdAt: string; stripeCouponId: string | null;
  admin: { email: string; name: string } | null;
}

export const promosApi = {
  list: (token: string, page = 1) =>
    req<{ codes: PromoCode[]; total: number; pages: number }>(`/admin/promos?page=${page}`, {}, token),
  create: (token: string, data: { code: string; description?: string; discountPercent: number; maxUses?: number; validUntil?: string }) =>
    req<PromoCode>("/admin/promos", { method: "POST", body: JSON.stringify(data) }, token),
  toggle: (token: string, id: string, isActive: boolean) =>
    req<PromoCode>(`/admin/promos/${id}/toggle`, { method: "PATCH", body: JSON.stringify({ isActive }) }, token),
};

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string; adminId: string | null; userId: string | null; action: string;
  resource: string; resourceId: string | null; metadata: unknown;
  ipAddress: string | null; userAgent: string | null; createdAt: string;
  admin: { email: string; name: string } | null;
}

export const auditApi = {
  list: (token: string, params: { resource?: string; action?: string; page?: number; from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.resource) q.set("resource", params.resource);
    if (params.action)   q.set("action",   params.action);
    if (params.page)     q.set("page",     String(params.page));
    if (params.from)     q.set("from",     params.from);
    if (params.to)       q.set("to",       params.to);
    return req<{ logs: AuditEntry[]; total: number; pages: number }>(
      `/admin/audit?${q.toString()}`, {}, token,
    );
  },
};

// ── Accounting ────────────────────────────────────────────────────────────────

export interface AccountingData {
  mrrUsd: number;
  activeSubscriptions: number;
  canceledThisMonth: number;
  newUsersThisMonth: number;
  managedRevenue: { current: number; previous: number };
  managedTokensThisMonth: number;
  totalRequestsThisMonth: number;
  recentSubscriptions: Array<{
    id: string; stripeSubId: string; status: string;
    currentPeriodEnd: string; createdAt: string;
    user: { email: string; name: string | null; plan: string; createdAt: string };
  }>;
}

export const accountingApi = {
  get: (token: string) => req<AccountingData>("/admin/accounting", {}, token),
};

// ── Admin team management ─────────────────────────────────────────────────────

export interface TeamMemberRow {
  id: string; email: string; name: string; role: string;
  isActive: boolean; lastLoginAt: string | null; createdAt: string;
  passwordHash?: string | null;
  invitedByAdmin: { email: string; name: string } | null;
}

export const adminsApi = {
  list:         (token: string) =>
    req<TeamMemberRow[]>("/admin/auth/admins", {}, token),
  invite:       (token: string, data: { email: string; name: string; role: string }) =>
    req<{ message: string; id: string }>("/admin/auth/invite", { method: "POST", body: JSON.stringify(data) }, token),
  deactivate:   (token: string, id: string) =>
    req<{ message: string }>(`/admin/auth/admins/${id}/deactivate`, { method: "PATCH" }, token),
  reactivate:   (token: string, id: string) =>
    req<{ message: string }>(`/admin/auth/admins/${id}/reactivate`, { method: "PATCH" }, token),
  changeRole:   (token: string, id: string, role: string) =>
    req<{ message: string }>(`/admin/auth/admins/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }, token),
  resendInvite: (token: string, id: string) =>
    req<{ message: string }>(`/admin/auth/admins/${id}/resend-invite`, { method: "POST" }, token),
};

// ── Billing config ────────────────────────────────────────────────────────────

export interface BillingConfig {
  id:                   string;
  trialDays:            number;
  paygRateProUsd:       number;
  paygRateFreeUsd:      number;
  managedMarkupPercent: number;
  updatedAt:            string;
}

export const billingConfigApi = {
  get:    (token: string) =>
    req<BillingConfig>("/admin/billing/config", {}, token),
  update: (token: string, data: Partial<Omit<BillingConfig, "id" | "updatedAt">>) =>
    req<BillingConfig>("/admin/billing/config", { method: "PATCH", body: JSON.stringify(data) }, token),
};

// ── Billing products ──────────────────────────────────────────────────────────

export interface AdminBillingProduct {
  id:              string;
  name:            string;
  description:     string | null;
  stripeProductId: string | null;
  stripePriceId:   string;
  planType:        string;
  interval:        string;
  amountCents:     number;
  currency:        string;
  isPublic:        boolean;
  isActive:        boolean;
  trialDays:       number | null;
  notes:           string | null;
  createdAt:       string;
  updatedAt:       string;
  _count:          { customAssignments: number };
}

export const billingProductsApi = {
  list:   (token: string) =>
    req<AdminBillingProduct[]>("/admin/billing/products", {}, token),
  create: (token: string, data: {
    name: string; description?: string;
    stripePriceId?: string;   // omit to auto-create in Stripe
    planType?: string; interval?: string; amountCents: number; currency?: string;
    isPublic?: boolean; isActive?: boolean; trialDays?: number; notes?: string;
  }) =>
    req<AdminBillingProduct>("/admin/billing/products", { method: "POST", body: JSON.stringify(data) }, token),
  toggle: (token: string, id: string, isActive: boolean) =>
    req<AdminBillingProduct>(`/admin/billing/products/${id}/toggle`, { method: "PATCH", body: JSON.stringify({ isActive }) }, token),
};

// ── Custom plan assignments ────────────────────────────────────────────────────

export interface CustomPlanAssignment {
  id:        string;
  userId:    string;
  productId: string;
  notes:     string | null;
  createdAt: string;
  user:      { id: string; email: string; name: string | null };
  product:   AdminBillingProduct;
}

export const customPlansApi = {
  list:   (token: string) =>
    req<CustomPlanAssignment[]>("/admin/billing/assignments", {}, token),
  assign: (token: string, data: { userId: string; productId: string; notes?: string }) =>
    req<CustomPlanAssignment>("/admin/billing/assignments", { method: "POST", body: JSON.stringify(data) }, token),
  remove: (token: string, userId: string) =>
    req<void>(`/admin/billing/assignments/${userId}`, { method: "DELETE" }, token),
};

// ── Domain allowlist ──────────────────────────────────────────────────────────

export interface DomainEntry {
  id?: string; domain: string; createdAt?: string; source: "env" | "db";
}

export const domainsApi = {
  list:   (token: string) =>
    req<{ env: DomainEntry[]; db: DomainEntry[] }>("/admin/auth/domains", {}, token),
  add:    (token: string, domain: string) =>
    req<DomainEntry>("/admin/auth/domains", { method: "POST", body: JSON.stringify({ domain }) }, token),
  remove: (token: string, domain: string) =>
    req<void>(`/admin/auth/domains/${encodeURIComponent(domain)}`, { method: "DELETE" }, token),
};
