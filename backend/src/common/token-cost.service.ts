import { Injectable } from '@nestjs/common';

export interface Pricing { input: number; output: number } // USD per 1M tokens

const PRICING: Record<string, Pricing> = {
  'gpt-4o':            { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':       { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':       { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo':     { input: 0.50,  output: 1.50  },
  'o1':                { input: 15.00, output: 60.00 },
  'o3-mini':           { input: 1.10,  output: 4.40  },
  'claude-opus-4-8':   { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6': { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':  { input: 0.25,  output: 1.25  },
  'gemini-2.0-flash':  { input: 0.10,  output: 0.40  },
  'gemini-1.5-pro':    { input: 1.25,  output: 5.00  },
  'gemini-1.5-flash':  { input: 0.075, output: 0.30  },
};

const CONTEXT_WINDOWS: Record<string, number> = {
  'gemini-2.0-flash':  1_048_576,
  'gemini-1.5-pro':    1_048_576,
  'gemini-1.5-flash':  1_048_576,
  'claude-opus-4-8':   200_000,
  'claude-sonnet-4-6': 200_000,
  'claude-haiku-4-5':  200_000,
};

@Injectable()
export class TokenCostService {
  getProvider(model: string): 'openai' | 'anthropic' | 'google' | null {
    if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
    if (model.startsWith('claude-'))  return 'anthropic';
    if (model.startsWith('gemini-'))  return 'google';
    return null;
  }

  calculate(model: string, promptTokens: number, completionTokens: number): number {
    const p = PRICING[model];
    if (!p) return 0;
    return (promptTokens / 1_000_000) * p.input + (completionTokens / 1_000_000) * p.output;
  }

  getSupportedModels() {
    return Object.entries(PRICING).map(([id, pricing]) => ({
      id,
      object: 'model',
      provider: this.getProvider(id),
      context_window: CONTEXT_WINDOWS[id] ?? 128_000,
      pricing_per_1m: pricing,
    }));
  }
}
