import { Injectable } from '@nestjs/common';
import { ProxyResult } from './openai.proxy';

@Injectable()
export class AnthropicProxy {
  async complete(req: Record<string, unknown>, apiKey: string): Promise<ProxyResult> {
    const start    = Date.now();
    const messages = (req.messages as Array<{ role: string; content: string }>);
    const system   = messages.filter(m => m.role === 'system').map(m => m.content).join('\n') || undefined;
    const filtered = messages.filter(m => m.role !== 'system');

    const anthropicReq = {
      model:      req.model,
      messages:   filtered,
      system,
      max_tokens: (req.max_tokens as number) ?? 4096,
      temperature:req.temperature,
      stream:     req.stream,
    };

    try {
      const res  = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body:    JSON.stringify(anthropicReq),
      });
      const raw  = (await res.json()) as Record<string, unknown>;
      const body = res.ok ? this.toOpenAIFormat(raw, req.model as string) : raw;
      const usage = body.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      return {
        status: res.status, body,
        promptTokens:     usage?.prompt_tokens     ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        status: 502, body: { error: { message: 'Upstream connection failed.', type: 'server_error' } },
        promptTokens: 0, completionTokens: 0, latencyMs: Date.now() - start,
      };
    }
  }

  /** Translate Anthropic response → OpenAI chat.completion format. */
  private toOpenAIFormat(raw: Record<string, unknown>, model: string): Record<string, unknown> {
    const content = (raw.content as Array<{ type: string; text: string }>)?.[0]?.text ?? '';
    const usage   = raw.usage as { input_tokens: number; output_tokens: number } | undefined;
    return {
      id:      `chatcmpl-${String(raw.id)}`,
      object:  'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop', logprobs: null }],
      usage: {
        prompt_tokens:     usage?.input_tokens  ?? 0,
        completion_tokens: usage?.output_tokens ?? 0,
        total_tokens:     (usage?.input_tokens  ?? 0) + (usage?.output_tokens ?? 0),
      },
    };
  }
}
