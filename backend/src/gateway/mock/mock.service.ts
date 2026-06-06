import { Injectable } from '@nestjs/common';

@Injectable()
export class MockService {
  generate(model: string, messages: Array<{ role: string; content: string }>) {
    const content =
      `[GateML · test mode] Synthetic response for model "${model}". ` +
      `Your request had ${messages.length} message(s). ` +
      `Use a live key at gateml.io/dashboard/gateway to make real LLM calls.`;

    const promptTokens     = messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
    const completionTokens = Math.ceil(content.length / 4);

    return {
      body: {
        id:      `chatcmpl-test_${Date.now()}`,
        object:  'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop', logprobs: null }],
        usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
        _gateml: { mode: 'test' },
      },
      promptTokens,
      completionTokens,
    };
  }

  simulateLatency(): Promise<void> {
    return new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 600)));
  }
}
