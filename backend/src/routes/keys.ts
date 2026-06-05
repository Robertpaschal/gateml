import { Hono } from "hono";
import { requireSession } from "../middleware/requireSession.js";
import { createApiKey, listApiKeys, revokeApiKey, maskKey } from "../services/keyManager.js";
import type { SessionContext } from "../types/index.js";

export const keys = new Hono();
keys.use(requireSession);

keys.get("/", (c) => {
  const { userId } = c.get("session") as SessionContext;
  return c.json(listApiKeys(userId).map(k => ({ ...k, key: maskKey(k.key) })));
});

keys.post("/", async (c) => {
  const { userId } = c.get("session") as SessionContext;
  const body = await c.req.json<{ name?: string; type?: string }>();
  const name = body.name?.trim();
  const type = body.type;

  if (!name || (type !== "test" && type !== "live")) {
    return c.json({ error: "name and type ('test' | 'live') required" }, 400);
  }

  const apiKey = createApiKey(userId, name, type);
  return c.json(apiKey, 201); // Full key returned only at creation time
});

keys.delete("/:id", (c) => {
  const { userId } = c.get("session") as SessionContext;
  const revoked = revokeApiKey(c.req.param("id"), userId);
  if (!revoked) return c.json({ error: "Key not found" }, 404);
  return c.json({ ok: true });
});
