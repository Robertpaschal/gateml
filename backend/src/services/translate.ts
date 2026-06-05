import type { OpenAIChatRequest } from "../types/index.js";

interface AnthropicRequest {
  model: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  system?: string;
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
}

export function toAnthropicRequest(req: OpenAIChatRequest): AnthropicRequest {
  const system = req.messages
    .filter(m => m.role === "system")
    .map(m => m.content)
    .join("\n") || undefined;

  const messages = req.messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  return {
    model: req.model,
    messages,
    system,
    max_tokens: req.max_tokens ?? 4096,
    temperature: req.temperature,
    stream: req.stream,
  };
}

export function fromAnthropicResponse(
  raw: Record<string, unknown>,
  requestedModel: string
): Record<string, unknown> {
  const content = (raw.content as Array<{ type: string; text: string }>)?.[0]?.text ?? "";
  const usage = raw.usage as { input_tokens: number; output_tokens: number } | undefined;

  return {
    id: `chatcmpl-${String(raw.id)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: requestedModel,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: raw.stop_reason === "end_turn" ? "stop" : raw.stop_reason,
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: usage?.input_tokens ?? 0,
      completion_tokens: usage?.output_tokens ?? 0,
      total_tokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
    },
  };
}
