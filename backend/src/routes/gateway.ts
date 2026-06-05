import { Hono } from "hono";
import { randomBytes } from "crypto";
import { requireApiKey } from "../middleware/requireApiKey.js";
import { executeWithFallback } from "../services/fallback.js";
import { generateMockResponse, simulateLatency } from "../services/mockResponse.js";
import { calculateCost, getSupportedModels } from "../services/tokenCost.js";
import { getDb } from "../db/connection.js";
import type { ApiKeyContext, FallbackEntry, OpenAIChatRequest } from "../types/index.js";

export const gateway = new Hono();
gateway.use(requireApiKey);

// OpenAI-compatible chat completions endpoint
gateway.post("/chat/completions", async (c) => {
  const ctx = c.get("apiKeyCtx") as ApiKeyContext;
  const req = await c.req.json<OpenAIChatRequest>();

  if (!req.model || !Array.isArray(req.messages)) {
    return c.json(
      { error: { message: "model and messages are required", type: "invalid_request_error" } },
      400
    );
  }

  const path = "/v1/chat/completions";
  const start = Date.now();

  if (ctx.keyType === "test") {
    await simulateLatency();
    const body = generateMockResponse(req);
    const usage = body.usage as { prompt_tokens: number; completion_tokens: number };
    writeLog(ctx, req.model, "mock", 200, Date.now() - start, usage.prompt_tokens, usage.completion_tokens, path, 0);
    return c.json(body);
  }

  // Live: look up routing config and forward with fallback
  const routeRow = getDb()
    .prepare("SELECT fallback_chain FROM routing_configs WHERE user_id = ?")
    .get(ctx.userId) as { fallback_chain: string } | undefined;
  const chain = routeRow ? (JSON.parse(routeRow.fallback_chain) as FallbackEntry[]) : [];

  const result = await executeWithFallback(ctx.userId, req, path, chain);
  const cost = calculateCost(result.finalModel, result.promptTokens, result.completionTokens);
  writeLog(ctx, result.finalModel, providerOf(result.finalModel), result.status, result.latencyMs, result.promptTokens, result.completionTokens, path, cost);

  return c.json(result.body, result.status as 200);
});

// Model listing
gateway.get("/models", (c) => {
  return c.json({ object: "list", data: getSupportedModels() });
});

function providerOf(model: string): string {
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("gemini-")) return "google";
  return "openai";
}

function writeLog(
  ctx: ApiKeyContext,
  model: string, provider: string, status: number,
  latencyMs: number, promptTokens: number, completionTokens: number,
  path: string, costUsd: number
): void {
  getDb().prepare(`
    INSERT INTO request_logs
      (id, api_key_id, user_id, model, provider, status, latency_ms, prompt_tokens, completion_tokens, cost_usd, path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomBytes(16).toString("hex"), ctx.apiKeyId, ctx.userId, model, provider, status, latencyMs, promptTokens, completionTokens, costUsd, path);
}
