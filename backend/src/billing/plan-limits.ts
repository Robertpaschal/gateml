export const PLAN_LIMITS = {
  FREE: {
    liveRequestsPerMonth: 1_000,
    maxApiKeyPairs:       1,
    logRetentionDays:     7,
    maxLogsPerQuery:      100,
    maxPrompts:           1,
    promptVersioning:     false,
    fallbackChain:        false,
    evalTesting:          false,
    paygRateUsd:          0.002,   // per request when over quota
  },
  PRO: {
    liveRequestsPerMonth: 30_000,
    maxApiKeyPairs:       5,
    logRetentionDays:     90,
    maxLogsPerQuery:      500,
    maxPrompts:           -1,      // unlimited
    promptVersioning:     true,
    fallbackChain:        true,
    evalTesting:          true,
    paygRateUsd:          0.001,
  },
  ENTERPRISE: {
    liveRequestsPerMonth: -1,      // unlimited
    maxApiKeyPairs:       -1,
    logRetentionDays:     365,
    maxLogsPerQuery:      1_000,
    maxPrompts:           -1,
    promptVersioning:     true,
    fallbackChain:        true,
    evalTesting:          true,
    paygRateUsd:          0,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export const PLAN_PRICES = {
  PRO_MONTHLY: { cents: 1900, label: '$19/mo',  interval: 'month' as const },
  PRO_ANNUAL:  { cents: 15200, label: '$152/yr', interval: 'year'  as const },
} as const;
