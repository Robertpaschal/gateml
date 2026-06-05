import { randomBytes } from "crypto";
import { getDb } from "../db/connection.js";
import type { ApiKey } from "../types/index.js";

export function newId(): string {
  return randomBytes(16).toString("hex");
}

function generateApiKey(type: "test" | "live"): string {
  return `gml-sk-${type}_${randomBytes(24).toString("hex")}`;
}

export function createApiKey(userId: string, name: string, type: "test" | "live"): ApiKey {
  const db = getDb();
  const id = newId();
  const key = generateApiKey(type);
  db.prepare(
    "INSERT INTO api_keys (id, user_id, name, key, type) VALUES (?, ?, ?, ?, ?)"
  ).run(id, userId, name, key, type);
  return db.prepare("SELECT * FROM api_keys WHERE id = ?").get(id) as ApiKey;
}

export function listApiKeys(userId: string): ApiKey[] {
  return getDb()
    .prepare("SELECT * FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC")
    .all(userId) as ApiKey[];
}

export function revokeApiKey(id: string, userId: string): boolean {
  const result = getDb()
    .prepare(
      "UPDATE api_keys SET revoked_at = unixepoch() WHERE id = ? AND user_id = ? AND revoked_at IS NULL"
    )
    .run(id, userId);
  return (result.changes as number) > 0;
}

export function maskKey(key: string): string {
  const idx = key.indexOf("_");
  if (idx === -1) return key;
  const prefix = key.slice(0, idx + 1);
  const secret = key.slice(idx + 1);
  return `${prefix}${secret.slice(0, 8)}${"•".repeat(Math.max(0, secret.length - 12))}${secret.slice(-4)}`;
}
