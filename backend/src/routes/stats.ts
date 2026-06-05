import { Hono } from "hono";
import { requireSession } from "../middleware/requireSession.js";
import { getDb } from "../db/connection.js";
import type { SessionContext } from "../types/index.js";

export const stats = new Hono();
stats.use(requireSession);

stats.get("/", (c) => {
  const { userId } = c.get("session") as SessionContext;
  const db = getDb();
  const since = Math.floor(Date.now() / 1000) - 86_400;

  const totals = db
    .prepare(`
      SELECT
        COUNT(*)                                           AS calls,
        SUM(prompt_tokens + completion_tokens)             AS tokens,
        SUM(cost_usd)                                      AS cost,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END)    AS errors
      FROM request_logs
      WHERE user_id = ? AND created_at >= ?
    `)
    .get(userId, since) as { calls: number; tokens: number; cost: number; errors: number } | undefined;

  const successCount = (db
    .prepare("SELECT COUNT(*) AS n FROM request_logs WHERE user_id = ? AND created_at >= ? AND status < 400")
    .get(userId, since) as { n: number } | undefined)?.n ?? 0;

  const p95Offset = Math.max(0, Math.ceil(successCount * 0.05) - 1);
  const p95Row = db
    .prepare("SELECT latency_ms FROM request_logs WHERE user_id = ? AND created_at >= ? AND status < 400 ORDER BY latency_ms DESC LIMIT 1 OFFSET ?")
    .get(userId, since, p95Offset) as { latency_ms: number } | undefined;

  const byModel = db
    .prepare(`
      SELECT model,
             COUNT(*)                               AS calls,
             SUM(cost_usd)                          AS cost,
             SUM(prompt_tokens + completion_tokens) AS tokens
      FROM request_logs
      WHERE user_id = ? AND created_at >= ?
      GROUP BY model
      ORDER BY calls DESC
    `)
    .all(userId, since) as Array<{ model: string; calls: number; cost: number; tokens: number }>;

  const hourly = db
    .prepare(`
      SELECT (created_at / 3600) * 3600 AS hour, COUNT(*) AS calls
      FROM request_logs
      WHERE user_id = ? AND created_at >= ?
      GROUP BY hour
      ORDER BY hour ASC
    `)
    .all(userId, since) as Array<{ hour: number; calls: number }>;

  const calls = totals?.calls ?? 0;
  return c.json({
    period: "24h",
    totalCalls: calls,
    totalTokens: totals?.tokens ?? 0,
    totalCostUsd: +(totals?.cost ?? 0).toFixed(4),
    errorRate: calls > 0 ? +((totals!.errors / calls) * 100).toFixed(2) : 0,
    p95LatencyMs: p95Row?.latency_ms ?? 0,
    byModel,
    hourly,
  });
});
