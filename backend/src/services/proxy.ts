import { getDb } from "../db/connection.js";
import { decryptKey } from "./encryption.js";
import { getModelProvider } from "./tokenCost.js";
import { toAnthropicRequest, fromAnthropicResponse } from "./translate.js";
import type { OpenAIChatRequest } from "../types/index.js";

export interface ProxyResult {
  status: number;
  body: Record<string, unknown>;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

function getStoredProviderKey(userId: string, provider: string): string | null {
  const row = getDb()
    .prepare("SELECT key_encrypted FROM provider_keys WHERE user_id = ? AND provider = ?")
    .get(userId, provider) as { key_encrypted: string } | undefined;
  return row ? decryptKey(row.key_encrypted) : null;
}

export async function proxyRequest(
  userId: string,
  req: OpenAIChatRequest,
  path: string
): Promise<ProxyResult> {
  const provider = getModelProvider(req.model);
  if (!provider) {
    return err(400, `Unknown model: ${req.model}`, "invalid_request_error");
  }

  const providerKey = getStoredProviderKey(userId, provider);
  if (!providerKey) {
    return err(400, `No ${provider} API key configured. Add it in Gateway → Provider Keys.`, "configuration_error");
  }

  const start = Date.now();

  if (provider === "openai") return forwardOpenAI(req, providerKey, path, start);
  if (provider === "anthropic") return forwardAnthropic(req, providerKey, start);

  return err(400, `Provider ${provider} not yet supported`, "invalid_request_error");
}

async function forwardOpenAI(
  req: OpenAIChatRequest,
  apiKey: string,
  path: string,
  start: number
): Promise<ProxyResult> {
  try {
    const res = await fetch(`https://api.openai.com${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(req),
    });
    const body = (await res.json()) as Record<string, unknown>;
    const usage = body.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    return {
      status: res.status,
      body,
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
    };
  } catch {
    return err(502, "Upstream connection failed", "server_error", Date.now() - start);
  }
}

async function forwardAnthropic(
  req: OpenAIChatRequest,
  apiKey: string,
  start: number
): Promise<ProxyResult> {
  try {
    const anthropicReq = toAnthropicRequest(req);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicReq),
    });
    const raw = (await res.json()) as Record<string, unknown>;
    const body = res.ok ? fromAnthropicResponse(raw, req.model) : raw;
    const usage = body.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    return {
      status: res.status,
      body,
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
    };
  } catch {
    return err(502, "Upstream connection failed", "server_error", Date.now() - start);
  }
}

function err(status: number, message: string, type: string, latencyMs = 0): ProxyResult {
  return { status, body: { error: { message, type } }, promptTokens: 0, completionTokens: 0, latencyMs };
}
