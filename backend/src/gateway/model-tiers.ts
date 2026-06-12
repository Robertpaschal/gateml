import { ModelTier } from '../billing/plan-limits';

// Mirrors the access levels the model owners themselves publish.
// STANDARD: cheapest / free-tier equivalents from each provider
// PREMIUM:  mid-range production models
// ALL:      frontier / most expensive models — enterprise only for managed keys
const MODEL_TIER: Record<string, ModelTier> = {
  'gpt-3.5-turbo':     'STANDARD',
  'gpt-4o-mini':       'STANDARD',
  'gemini-2.0-flash':  'STANDARD',
  'gemini-1.5-flash':  'STANDARD',
  'claude-haiku-4-5':  'STANDARD',
  'o3-mini':           'PREMIUM',
  'gpt-4o':            'PREMIUM',
  'gemini-1.5-pro':    'PREMIUM',
  'claude-sonnet-4-6': 'PREMIUM',
  'gpt-4-turbo':       'ALL',
  'o1':                'ALL',
  'claude-opus-4-8':   'ALL',
};

const TIER_RANK: Record<ModelTier, number> = { STANDARD: 0, PREMIUM: 1, ALL: 2 };

/**
 * Returns true when a managed-key call to `model` is allowed under `planTier`.
 * BYOK callers must never reach this check — they bypass all tier enforcement.
 */
export function isModelAllowedForManagedTier(model: string, planTier: ModelTier): boolean {
  const modelTier = MODEL_TIER[model];
  if (!modelTier) return false; // unknown model → deny
  return TIER_RANK[modelTier] <= TIER_RANK[planTier];
}

export function getModelTier(model: string): ModelTier | 'UNKNOWN' {
  return MODEL_TIER[model] ?? 'UNKNOWN';
}

/** Human-readable list of models allowed for a plan tier. */
export function allowedModelsForTier(planTier: ModelTier): string[] {
  return Object.entries(MODEL_TIER)
    .filter(([, t]) => TIER_RANK[t] <= TIER_RANK[planTier])
    .map(([m]) => m);
}
