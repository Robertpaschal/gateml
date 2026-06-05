import { createMiddleware } from "hono/factory";
import { getDb } from "../db/connection.js";
import type { ApiKey, ApiKeyContext } from "../types/index.js";

export const requireApiKey = createMiddleware(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer gml-sk-")) {
    return c.json(
      { error: { message: "Missing or invalid GateML API key", type: "auth_error" } },
      401
    );
  }

  const key = auth.slice(7).trim();
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM api_keys WHERE key = ? AND revoked_at IS NULL")
    .get(key) as ApiKey | undefined;

  if (!row) {
    return c.json({ error: { message: "Invalid API key", type: "auth_error" } }, 401);
  }

  db.prepare("UPDATE api_keys SET last_used_at = unixepoch() WHERE id = ?").run(row.id);

  const ctx: ApiKeyContext = { apiKeyId: row.id, userId: row.user_id, keyType: row.type };
  c.set("apiKeyCtx", ctx);
  await next();
});
