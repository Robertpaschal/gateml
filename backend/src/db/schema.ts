import { getDb } from "./connection.js";

export function migrate(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      key          TEXT UNIQUE NOT NULL,
      type         TEXT NOT NULL CHECK (type IN ('test', 'live')),
      created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      last_used_at INTEGER,
      revoked_at   INTEGER
    );

    CREATE TABLE IF NOT EXISTS provider_keys (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider      TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
      key_encrypted TEXT NOT NULL,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(user_id, provider)
    );

    CREATE TABLE IF NOT EXISTS routing_configs (
      id             TEXT PRIMARY KEY,
      user_id        TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      primary_model  TEXT NOT NULL DEFAULT 'gpt-4o',
      fallback_chain TEXT NOT NULL DEFAULT '[]',
      updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS request_logs (
      id                TEXT PRIMARY KEY,
      api_key_id        TEXT NOT NULL REFERENCES api_keys(id),
      user_id           TEXT NOT NULL REFERENCES users(id),
      model             TEXT NOT NULL,
      provider          TEXT NOT NULL,
      status            INTEGER NOT NULL,
      latency_ms        INTEGER NOT NULL,
      prompt_tokens     INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd          REAL NOT NULL DEFAULT 0,
      path              TEXT NOT NULL,
      created_at        INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_request_logs_user_created
      ON request_logs(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS prompts (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id        TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      version   INTEGER NOT NULL,
      body      TEXT NOT NULL,
      note      TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(prompt_id, version)
    );
  `);
}
