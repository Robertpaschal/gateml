export const PLAN_LIMITS = {
  FREE: {
    liveRequestsPerMonth:   1_000,
    managedTokensPerMonth:  100_000,  // hard token budget for managed-key calls
    managedRequestsPerDay:  50,       // daily cap on managed-key calls only
    burstRequestsPerMinute: 5,        // all calls (BYOK + managed)
    managedModelTier:       'STANDARD' as const,
    maxApiKeyPairs:         1,
    logRetentionDays:       7,
    maxLogsPerQuery:        100,
    maxPrompts:             1,
    promptVersioning:       false,
    fallbackChain:          false,
    evalTesting:            false,
    paygRateUsd:            0.002,
  },
  PRO: {
    liveRequestsPerMonth:   30_000,
    managedTokensPerMonth:  5_000_000,
    managedRequestsPerDay:  2_000,
    burstRequestsPerMinute: 60,
    managedModelTier:       'PREMIUM' as const,
    maxApiKeyPairs:         5,
    logRetentionDays:       90,
    maxLogsPerQuery:        500,
    maxPrompts:             -1,
    promptVersioning:       true,
    fallbackChain:          true,
    evalTesting:            true,
    paygRateUsd:            0.001,
  },
  ENTERPRISE: {
    liveRequestsPerMonth:   -1,
    managedTokensPerMonth:  -1,       // unlimited
    managedRequestsPerDay:  -1,       // unlimited
    burstRequestsPerMinute: 500,
    managedModelTier:       'ALL' as const,
    maxApiKeyPairs:         -1,
    logRetentionDays:       365,
    maxLogsPerQuery:        1_000,
    maxPrompts:             -1,
    promptVersioning:       true,
    fallbackChain:          true,
    evalTesting:            true,
    paygRateUsd:            0,
  },
} as const;

export type PlanKey      = keyof typeof PLAN_LIMITS;
export type ModelTier    = 'STANDARD' | 'PREMIUM' | 'ALL';

export const PLAN_PRICES = {
  PRO_MONTHLY: { cents: 1900, label: '$19/mo',  interval: 'month' as const },
  PRO_ANNUAL:  { cents: 15200, label: '$152/yr', interval: 'year'  as const },
} as const;
