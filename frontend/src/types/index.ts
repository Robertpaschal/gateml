export interface ApiKey {
  id: string;
  name: string;
  key: string;
  type: "test" | "live";
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

export interface ProviderKey {
  id: string;
  provider: "openai" | "anthropic" | "google";
  created_at: number;
}

export interface FallbackEntry {
  model: string;
  on: number[];
}

export interface RoutingConfig {
  primaryModel: string;
  fallbackChain: FallbackEntry[];
}

export interface RequestLog {
  id: string;
  model: string;
  provider: string;
  status: number;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  path: string;
  created_at: number;
}

export interface Stats {
  period: "24h";
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  errorRate: number;
  p95LatencyMs: number;
  byModel: Array<{ model: string; calls: number; cost: number; tokens: number }>;
  hourly: Array<{ hour: number; calls: number }>;
}

export interface AuthUser {
  userId: string;
  email: string;
  token: string;
}

export interface SignupResult {
  token: string;
  testKey: string;
  liveKey: string;
}
