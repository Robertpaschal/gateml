import { Injectable } from '@nestjs/common';
import { ProxyResult } from '../proxy/openai.proxy';
import { FallbackEntry } from '../../routing/routing.service';

export type ProxyFn = (model: string) => Promise<ProxyResult>;

const RETRYABLE = new Set([429, 500, 502, 503]);

@Injectable()
export class FallbackService {
  /**
   * Execute a request through a fallback chain.
   * @param primaryModel  The model to try first.
   * @param chain         Ordered list of fallback entries.
   * @param proxyFn       A function that calls the upstream with a given model.
   * @returns             The final ProxyResult and the model that produced it.
   */
  async execute(
    primaryModel: string,
    chain: FallbackEntry[],
    proxyFn: ProxyFn,
  ): Promise<ProxyResult & { finalModel: string }> {
    let result = await proxyFn(primaryModel);
    let finalModel = primaryModel;

    for (let i = 0; i < chain.length; i++) {
      const trigger = chain[i].on.length ? new Set(chain[i].on) : RETRYABLE;
      if (!trigger.has(result.status)) break;

      await this.backoff(i);
      finalModel = chain[i].model;
      result = await proxyFn(finalModel);
    }

    return { ...result, finalModel };
  }

  private backoff(attempt: number): Promise<void> {
    const ms = Math.min(100 * 2 ** attempt, 2000);
    return new Promise(r => setTimeout(r, ms));
  }
}
