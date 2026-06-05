const DEFAULT_BASE_URL = "https://api.gateml.io/v1";

export interface GateMLOptions {
  apiKey: string;
  baseURL?: string;
}

/**
 * Returns a config object compatible with the OpenAI SDK constructor.
 *
 * @example
 * import OpenAI from 'openai';
 * import { getConfig } from 'gateml';
 *
 * const client = new OpenAI(getConfig({ apiKey: 'gml-sk-live_...' }));
 */
export function getConfig(opts: GateMLOptions): { apiKey: string; baseURL: string } {
  return {
    apiKey: opts.apiKey,
    baseURL: opts.baseURL ?? DEFAULT_BASE_URL,
  };
}

/**
 * Returns a fully-configured OpenAI SDK client pointed at GateML.
 * Requires `openai` to be installed in your project.
 *
 * @example
 * import { createGateMLClient } from 'gateml';
 *
 * const client = createGateMLClient({ apiKey: 'gml-sk-live_...' });
 * const res = await client.chat.completions.create({ model: 'gpt-4o', messages: [...] });
 */
export async function createGateMLClient(opts: GateMLOptions) {
  // Dynamic import so openai is truly optional for users who just use getConfig()
  const { default: OpenAI } = await import("openai");
  return new OpenAI(getConfig(opts));
}

/**
 * Synchronous version — use when you know openai is installed.
 * Import openai yourself and pass it in.
 *
 * @example
 * import OpenAI from 'openai';
 * import { createGateMLClientSync } from 'gateml';
 *
 * const client = createGateMLClientSync(OpenAI, { apiKey: 'gml-sk-live_...' });
 */
export function createGateMLClientSync<T>(
  OpenAIClass: new (opts: { apiKey: string; baseURL: string }) => T,
  opts: GateMLOptions
): T {
  return new OpenAIClass(getConfig(opts));
}

// Default export: the most common usage pattern
export default createGateMLClient;
