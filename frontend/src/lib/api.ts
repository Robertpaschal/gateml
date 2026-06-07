/**
 * Typed fetch wrapper for the GateML NestJS backend.
 * All requests go to /api (proxied by Next.js to the backend in dev,
 * or to NEXT_PUBLIC_API_URL directly in production).
 */

const BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : "/api";

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
    throw new ApiError(res.status, body.message ?? body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  me: (token: string) =>
    request<{
      id: string; email: string; name?: string; avatarUrl?: string;
      plan: "FREE" | "PRO" | "ENTERPRISE";
      payAsYouGo: boolean;
      usage: { requests: number; limit: number };
    }>("/auth/me", {}, token),
};

// ── Billing ───────────────────────────────────────────────────────────────────

export interface BillingLimits {
  liveRequestsPerMonth: number;
  maxApiKeyPairs: number;
  logRetentionDays: number;
  maxLogsPerQuery: number;
  maxPrompts: number;
  promptVersioning: boolean;
  fallbackChain: boolean;
  evalTesting: boolean;
  paygRateUsd: number;
}

export interface BillingMe {
  plan: "FREE" | "PRO" | "ENTERPRISE";
  payAsYouGo: boolean;
  useManaged: boolean;
  limits: BillingLimits;
  usage: { requests: number; month: string };
  managedUsage: { tokensUsed: number; costUsd: number };
  nextResetAt: string;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export const billingApi = {
  me: (token: string) =>
    request<BillingMe>("/billing/me", {}, token),
  checkout: (token: string, priceId: string) =>
    request<{ url: string }>("/billing/checkout", { method: "POST", body: JSON.stringify({ priceId }) }, token),
  portal: (token: string) =>
    request<{ url: string }>("/billing/portal", { method: "POST" }, token),
  togglePayg: (token: string, enabled: boolean) =>
    request<{ payAsYouGo: boolean }>("/billing/payg", { method: "POST", body: JSON.stringify({ enabled }) }, token),
  toggleManaged: (token: string, enabled: boolean) =>
    request<{ useManaged: boolean }>("/billing/managed", { method: "POST", body: JSON.stringify({ enabled }) }, token),
};

// ── API Keys ─────────────────────────────────────────────────────────────────

export interface ApiKeyRow {
  id: string; name: string; keyPrefix: string; type: "TEST" | "LIVE";
  createdAt: string; lastUsedAt: string | null;
}

export const keysApi = {
  list: (token: string)                              => request<ApiKeyRow[]>("/keys", {}, token),
  create: (token: string, name: string, type: "TEST"|"LIVE") =>
    request<ApiKeyRow & { key: string }>("/keys", { method: "POST", body: JSON.stringify({ name, type }) }, token),
  revoke: (token: string, id: string)               => request<void>(`/keys/${id}`, { method: "DELETE" }, token),
};

// ── Provider Keys ─────────────────────────────────────────────────────────────

export const providerKeysApi = {
  list: (token: string) =>
    request<Array<{ id: string; provider: string; updatedAt: string }>>("/provider-keys", {}, token),
  upsert: (token: string, provider: string, key: string) =>
    request<void>(`/provider-keys/${provider}`, { method: "PUT", body: JSON.stringify({ key }) }, token),
  remove: (token: string, provider: string) =>
    request<void>(`/provider-keys/${provider}`, { method: "DELETE" }, token),
};

// ── Routing ───────────────────────────────────────────────────────────────────

export const routingApi = {
  get: (token: string) =>
    request<{ primaryModel: string; fallbackChain: Array<{ model: string; on: number[] }> }>("/routing", {}, token),
  update: (token: string, body: { primaryModel: string; fallbackChain: Array<{ model: string; on: number[] }> }) =>
    request<void>("/routing", { method: "PUT", body: JSON.stringify(body) }, token),
};

// ── Logs ──────────────────────────────────────────────────────────────────────

export interface LogRow {
  id: string; model: string; provider: string; status: number;
  latencyMs: number; promptTokens: number; completionTokens: number;
  costUsd: number; path: string; isTestMode: boolean; createdAt: string;
}

export const logsApi = {
  list: (token: string, limit = 50, offset = 0) =>
    request<LogRow[]>(`/logs?limit=${limit}&offset=${offset}`, {}, token),
};

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface Stats {
  period: "24h";
  totalCalls: number;  totalTokens: number;  totalCostUsd: number;
  errorRate: number;   p95LatencyMs: number;
  byModel: Array<{ model: string; calls: number; cost: number; tokens: number }>;
  hourly:  Array<{ hour: number; calls: number }>;
}

export const statsApi = {
  get: (token: string) => request<Stats>("/stats", {}, token),
};

// ── Support ───────────────────────────────────────────────────────────────────

export const supportApi = {
  contact: (token: string, subject: string, body: string) =>
    request<{ id: string; status: string }>("/support/contact", {
      method: "POST",
      body:   JSON.stringify({ subject, body }),
    }, token),
};
