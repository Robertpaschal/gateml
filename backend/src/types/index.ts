export interface User {
  id: string;
  email: string;
  created_at: number;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  type: "test" | "live";
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

export interface ProviderKey {
  id: string;
  user_id: string;
  provider: "openai" | "anthropic" | "google";
  key_encrypted: string;
  created_at: number;
}

export interface FallbackEntry {
  model: string;
  on: number[];
}

export interface RoutingConfig {
  id: string;
  user_id: string;
  primary_model: string;
  fallback_chain: string;
  updated_at: number;
}

export interface RequestLog {
  id: string;
  api_key_id: string;
  user_id: string;
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

export interface OpenAIChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  [key: string]: unknown;
}

export interface SessionContext {
  userId: string;
  email: string;
}

export interface ApiKeyContext {
  apiKeyId: string;
  userId: string;
  keyType: "test" | "live";
}
