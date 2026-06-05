const BASE = "/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Auth
export const authApi = {
  signup: (email: string, password: string) =>
    request<{ token: string; testKey: string; liveKey: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: (token: string) =>
    request<{ userId: string; email: string }>("/auth/me", {}, token),
};

// API keys
export const keysApi = {
  list: (token: string) =>
    request<import("../types/index.js").ApiKey[]>("/keys", {}, token),
  create: (token: string, name: string, type: "test" | "live") =>
    request<import("../types/index.js").ApiKey>("/keys", {
      method: "POST",
      body: JSON.stringify({ name, type }),
    }, token),
  revoke: (token: string, id: string) =>
    request<{ ok: boolean }>(`/keys/${id}`, { method: "DELETE" }, token),
};

// Provider keys
export const providerKeysApi = {
  list: (token: string) =>
    request<import("../types/index.js").ProviderKey[]>("/provider-keys", {}, token),
  upsert: (token: string, provider: string, key: string) =>
    request<{ ok: boolean }>(`/provider-keys/${provider}`, {
      method: "PUT",
      body: JSON.stringify({ key }),
    }, token),
  remove: (token: string, provider: string) =>
    request<{ ok: boolean }>(`/provider-keys/${provider}`, { method: "DELETE" }, token),
};

// Routing config
export const routingApi = {
  get: (token: string) =>
    request<import("../types/index.js").RoutingConfig>("/routing", {}, token),
  update: (token: string, config: import("../types/index.js").RoutingConfig) =>
    request<{ ok: boolean }>("/routing", {
      method: "PUT",
      body: JSON.stringify(config),
    }, token),
};

// Logs
export const logsApi = {
  list: (token: string, limit = 50, offset = 0) =>
    request<import("../types/index.js").RequestLog[]>(
      `/logs?limit=${limit}&offset=${offset}`, {}, token
    ),
};

// Stats
export const statsApi = {
  get: (token: string) =>
    request<import("../types/index.js").Stats>("/stats", {}, token),
};
