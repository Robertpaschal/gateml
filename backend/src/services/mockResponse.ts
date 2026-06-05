import type { OpenAIChatRequest } from "../types/index.js";

export function generateMockResponse(req: OpenAIChatRequest): Record<string, unknown> {
  const content = `[GateML test mode] This is a synthetic response for model "${req.model}". ` +
    `Your request had ${req.messages.length} message(s). ` +
    `Switch to a live key at gateml.io to make real LLM calls.`;

  const promptTokens = req.messages.reduce(
    (sum, m) => sum + Math.ceil(m.content.length / 4),
    0
  );
  const completionTokens = Math.ceil(content.length / 4);

  return {
    id: `chatcmpl-test_${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: req.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
    _gateml: { mode: "test" },
  };
}

export async function simulateLatency(): Promise<void> {
  const ms = 200 + Math.floor(Math.random() * 600);
  await new Promise(resolve => setTimeout(resolve, ms));
}
