import { Hono } from "hono";
import { requireSession } from "../middleware/requireSession.js";
import { encryptKey } from "../services/encryption.js";
import { getDb } from "../db/connection.js";
import { newId } from "../services/keyManager.js";
import type { SessionContext } from "../types/index.js";

const PROVIDERS = ["openai", "anthropic", "google"] as const;
type Provider = typeof PROVIDERS[number];

export const providerKeys = new Hono();
providerKeys.use(requireSession);

providerKeys.get("/", (c) => {
  const { userId } = c.get("session") as SessionContext;
  const rows = getDb()
    .prepare("SELECT id, provider, created_at FROM provider_keys WHERE user_id = ?")
    .all(userId) as Array<{ id: string; provider: string; created_at: number }>;
  return c.json(rows);
});

providerKeys.put("/:provider", async (c) => {
  const { userId } = c.get("session") as SessionContext;
  const provider = c.req.param("provider") as Provider;

  if (!PROVIDERS.includes(provider)) {
    return c.json({ error: `Unknown provider. Must be one of: ${PROVIDERS.join(", ")}` }, 400);
  }

  const body = await c.req.json<{ key?: string }>();
  if (!body.key) return c.json({ error: "key required" }, 400);

  const encrypted = encryptKey(body.key);
  getDb().prepare(`
    INSERT INTO provider_keys (id, user_id, provider, key_encrypted)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, provider) DO UPDATE SET key_encrypted = excluded.key_encrypted
  `).run(newId(), userId, provider, encrypted);

  return c.json({ ok: true, provider });
});

providerKeys.delete("/:provider", (c) => {
  const { userId } = c.get("session") as SessionContext;
  getDb()
    .prepare("DELETE FROM provider_keys WHERE user_id = ? AND provider = ?")
    .run(userId, c.req.param("provider"));
  return c.json({ ok: true });
});
