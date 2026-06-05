import { Hono } from "hono";
import { requireSession } from "../middleware/requireSession.js";
import { getDb } from "../db/connection.js";
import type { SessionContext, RequestLog } from "../types/index.js";

export const logs = new Hono();
logs.use(requireSession);

logs.get("/", (c) => {
  const { userId } = c.get("session") as SessionContext;
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  const rows = getDb()
    .prepare("SELECT * FROM request_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(userId, limit, offset) as RequestLog[];

  return c.json(rows);
});
