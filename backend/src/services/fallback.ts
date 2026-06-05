import { proxyRequest } from "./proxy.js";
import type { ProxyResult } from "./proxy.js";
import type { FallbackEntry, OpenAIChatRequest } from "../types/index.js";

export interface FallbackResult extends ProxyResult {
  finalModel: string;
}

const RETRYABLE = new Set([429, 500, 502, 503]);

export async function executeWithFallback(
  userId: string,
  req: OpenAIChatRequest,
  path: string,
  chain: FallbackEntry[]
): Promise<FallbackResult> {
  let result = await proxyRequest(userId, req, path);
  let finalModel = req.model;

  for (let i = 0; i < chain.length; i++) {
    const triggerCodes = chain[i].on.length > 0 ? new Set(chain[i].on) : RETRYABLE;
    if (!triggerCodes.has(result.status)) break;

    await backoff(i);
    finalModel = chain[i].model;
    result = await proxyRequest(userId, { ...req, model: finalModel }, path);
  }

  return { ...result, finalModel };
}

async function backoff(attempt: number): Promise<void> {
  const ms = Math.min(100 * Math.pow(2, attempt), 2000);
  await new Promise(resolve => setTimeout(resolve, ms));
}
