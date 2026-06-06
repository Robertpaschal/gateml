// Shared types for src/pages/* components.
// Re-exports from src/lib/api where possible; defines the rest inline.

export type { Stats, LogRow as RequestLog } from "./lib/api";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  type: "TEST" | "LIVE";
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ProviderKey {
  id: string;
  provider: string;
  updatedAt: string;
}

export interface RoutingConfig {
  primaryModel: string;
  fallbackChain: Array<{ model: string; on: number[] }>;
}
