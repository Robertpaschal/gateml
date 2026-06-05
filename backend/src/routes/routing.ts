import { Hono } from "hono";
import { requireSession } from "../middleware/requireSession.js";
import { getDb } from "../db/connection.js";
import { newId } from "../services/keyManager.js";
import type { SessionContext, FallbackEntry } from "../types/index.js";

export const routing = new Hono();
routing.use(requireSession);

routing.get("/", (c) => {
  const { userId } = c.get("session") as SessionContext;
  const row = getDb()
    .prepare("SELECT primary_model, fallback_chain FROM routing_configs WHERE user_id = ?")
    .get(userId) as { primary_model: string; fallback_chain: string } | undefined;

  if (!row) return c.json({ primaryModel: "gpt-4o", fallbackChain: [] });
  return c.json({
    primaryModel: row.primary_model,
    fallbackChain: JSON.parse(row.fallback_chain) as FallbackEntry[],
  });
});

routing.put("/", async (c) => {
  const { userId } = c.get("session") as SessionContext;
  const body = await c.req.json<{ primaryModel?: string; fallbackChain?: FallbackEntry[] }>();

  if (!body.primaryModel) return c.json({ error: "primaryModel required" }, 400);

  const chain = JSON.stringify(body.fallbackChain ?? []);
  getDb().prepare(`
    INSERT INTO routing_configs (id, user_id, primary_model, fallback_chain, updated_at)
    VALUES (?, ?, ?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET
      primary_model = excluded.primary_model,
      fallback_chain = excluded.fallback_chain,
      updated_at = excluded.updated_at
  `).run(newId(), userId, body.primaryModel, chain);

  return c.json({ ok: true });
});
