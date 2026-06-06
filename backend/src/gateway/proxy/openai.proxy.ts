import { Injectable } from '@nestjs/common';

export interface ProxyResult {
  status:           number;
  body:             Record<string, unknown>;
  promptTokens:     number;
  completionTokens: number;
  latencyMs:        number;
}

@Injectable()
export class OpenAIProxy {
  async complete(
    req: Record<string, unknown>,
    apiKey: string,
    path: string,
  ): Promise<ProxyResult> {
    const start = Date.now();
    try {
      const res  = await fetch(`https://api.openai.com${path}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body:    JSON.stringify(req),
      });
      const body  = (await res.json()) as Record<string, unknown>;
      const usage = body.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      return {
        status:           res.status,
        body,
        promptTokens:     usage?.prompt_tokens     ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        latencyMs:        Date.now() - start,
      };
    } catch {
      return this.upstreamError(Date.now() - start);
    }
  }

  private upstreamError(latencyMs: number): ProxyResult {
    return {
      status:  502,
      body:    { error: { message: 'Upstream connection failed.', type: 'server_error' } },
      promptTokens: 0, completionTokens: 0, latencyMs,
    };
  }
}
