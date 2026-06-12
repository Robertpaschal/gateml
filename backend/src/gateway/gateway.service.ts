import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService }        from '@nestjs/config';
import { OpenAIProxy }          from './proxy/openai.proxy';
import { AnthropicProxy }       from './proxy/anthropic.proxy';
import { FallbackService }      from './fallback/fallback.service';
import { MockService }          from './mock/mock.service';
import { ProviderKeysService }  from '../provider-keys/provider-keys.service';
import { RoutingService }       from '../routing/routing.service';
import { LogsService }          from '../logs/logs.service';
import { TokenCostService }     from '../common/token-cost.service';
import { CacheService }         from '../common/cache.service';
import { RateLimitService }     from '../common/rate-limit.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { BillingService }       from '../billing/billing.service';
import { PLAN_LIMITS, PlanKey } from '../billing/plan-limits';
import { isModelAllowedForManagedTier, allowedModelsForTier, getModelTier } from './model-tiers';
import { LLMProvider }          from '@prisma/client';
import { ApiKeyContext }         from '../auth/decorators/api-key-context.decorator';

const CACHE_TTL_SECS = 3600; // 1 hour

interface CachedResponse {
  body:             Record<string, unknown>;
  promptTokens:     number;
  completionTokens: number;
  model:            string;
  provider:         string;
}

@Injectable()
export class GatewayService {
  constructor(
    private readonly openai:    OpenAIProxy,
    private readonly anthropic: AnthropicProxy,
    private readonly fallback:  FallbackService,
    private readonly mock:      MockService,
    private readonly provKeys:  ProviderKeysService,
    private readonly routing:   RoutingService,
    private readonly logs:      LogsService,
    private readonly cost:      TokenCostService,
    private readonly cache:     CacheService,
    private readonly rateLimit: RateLimitService,
    private readonly firebase:  FirebaseAdminService,
    private readonly billing:   BillingService,
    private readonly config:    ConfigService,
  ) {}

  /**
   * Cache key covers all fields that determine response content.
   * Returns null when the request is non-cacheable (streaming, non-zero temperature).
   */
  private buildCacheKey(req: Record<string, unknown>): string | null {
    // Never cache streaming responses — they're delivered as SSE, not JSON
    if (req.stream === true) return null;

    // Only cache deterministic requests (temperature 0 or not set)
    const temp = req.temperature as number | undefined | null;
    if (temp !== undefined && temp !== null && temp !== 0) return null;

    const fingerprint = JSON.stringify({
      model:      req.model,
      messages:   req.messages,
      max_tokens: req.max_tokens ?? null,
      top_p:      req.top_p ?? null,
      system:     req.system ?? null,
    });
    const hash = createHash('sha256').update(fingerprint).digest('hex');
    return `gateml:resp:v1:${hash}`;
  }

  /** Returns GateML's own API key for a provider if configured, else null. */
  private getManagedKey(provider: 'openai' | 'anthropic' | 'google'): string | null {
    const envMap: Record<string, string> = {
      openai:    'GATEML_OPENAI_API_KEY',
      anthropic: 'GATEML_ANTHROPIC_API_KEY',
      google:    'GATEML_GOOGLE_API_KEY',
    };
    return this.config.get<string>(envMap[provider]) ?? null;
  }

  async chatCompletions(req: Record<string, unknown>, ctx: ApiKeyContext) {
    const model    = req.model as string | undefined;
    const messages = req.messages as Array<{ role: string; content: string }> | undefined;

    if (!model || !Array.isArray(messages)) {
      throw new BadRequestException('model and messages are required.');
    }

    const path  = '/v1/chat/completions';
    const start = Date.now();

    // ── Test mode: return synthetic response ──────────────────────────────────
    if (ctx.keyType === 'TEST') {
      await this.mock.simulateLatency();
      const { body, promptTokens, completionTokens } = this.mock.generate(model, messages);
      const latencyMs = Date.now() - start;
      await this.logs.write({ apiKeyId: ctx.apiKeyId, userId: ctx.userId, model, provider: 'mock', status: 200, latencyMs, promptTokens, completionTokens, costUsd: 0, path, isTestMode: true });
      void this.firebase.writeUserPulse(ctx.userId, { lastRequestAt: new Date(), latestStatus: 200, latestModel: model, latestLatencyMs: latencyMs, latestCostUsd: 0, isTestMode: true, dailyCalls: 0, dailyCostUsd: 0, errorRate: 0 });
      return body;
    }

    // ── Quota check (returns plan + managed flags in one DB hit) ─────────────
    const { useManaged, isPaygOverage, plan } = await this.billing.checkQuota(ctx.userId);
    const planLimits = PLAN_LIMITS[plan as PlanKey] ?? PLAN_LIMITS.FREE;

    // ── Burst rate limit (all calls) ─────────────────────────────────────────
    await this.rateLimit.checkBurst(ctx.userId, planLimits.burstRequestsPerMinute);

    // Count this request toward the monthly quota immediately.
    // PAYG marking happens after the proxy — only for BYOK overage, never for managed.
    void this.billing.incrementUsage(ctx.userId);

    // ── Cache check (deterministic requests only) ─────────────────────────────
    const cacheKey = this.buildCacheKey(req);
    if (cacheKey) {
      const hit = await this.cache.get<CachedResponse>(cacheKey);
      if (hit) {
        const latencyMs = Date.now() - start;
        await this.logs.write({ apiKeyId: ctx.apiKeyId, userId: ctx.userId, model: hit.model, provider: hit.provider, status: 200, latencyMs, promptTokens: hit.promptTokens, completionTokens: hit.completionTokens, costUsd: 0, path, isTestMode: false, cached: true });
        void this.firebase.writeUserPulse(ctx.userId, { lastRequestAt: new Date(), latestStatus: 200, latestModel: hit.model, latestLatencyMs: latencyMs, latestCostUsd: 0, isTestMode: false, dailyCalls: 0, dailyCostUsd: 0, errorRate: 0 });
        return { ...hit.body, id: `chatcmpl-cache-${Date.now()}`, created: Math.floor(Date.now() / 1000) };
      }
    }

    // ── Live mode: route + fallback ───────────────────────────────────────────
    const chain = await this.routing.getFallbackChain(ctx.userId);

    // Track managed-key usage across all fallback attempts
    const markupFactor     = await this.billing.getManagedMarkupFactor();
    let managedTokensUsed  = 0;
    let managedCostAccrued = 0;

    const result = await this.fallback.execute(model, chain, async (m) => {
      const provider = this.cost.getProvider(m);
      if (!provider) {
        return { status: 400, body: { error: { message: `Unknown model: ${m}`, type: 'invalid_request_error' } }, promptTokens: 0, completionTokens: 0, latencyMs: 0 };
      }

      let apiKey = await this.provKeys.getDecryptedKey(ctx.userId, provider.toUpperCase() as LLMProvider);
      let isManagedCall = false;

      if (!apiKey) {
        if (useManaged) {
          // ── Model tier gate — BYOK bypasses this entirely ──────────────────
          const allowedTier = planLimits.managedModelTier;
          if (!isModelAllowedForManagedTier(m, allowedTier)) {
            const allowed = allowedModelsForTier(allowedTier).join(', ');
            return {
              status: 403,
              body: {
                error: {
                  message:      `Model "${m}" (tier: ${getModelTier(m)}) is not available with GateML Managed Keys on the ${plan} plan. Available models: ${allowed}. Upgrade your plan or add your own API key.`,
                  type:         'permission_error',
                  model:        m,
                  modelTier:    getModelTier(m),
                  planTier:     allowedTier,
                  allowedModels: allowedModelsForTier(allowedTier),
                },
              },
              promptTokens: 0, completionTokens: 0, latencyMs: 0,
            };
          }

          const masterKey = this.getManagedKey(provider);
          if (masterKey) {
            // ── Daily managed-key cap ─────────────────────────────────────────
            await this.rateLimit.checkDailyManaged(ctx.userId, planLimits.managedRequestsPerDay);
            apiKey = masterKey;
            isManagedCall = true;
          }
        }
        if (!apiKey) {
          return {
            status: 400,
            body:   { error: { message: `No ${provider} key configured. Add your own key or enable GateML Managed Keys in Gateway settings.`, type: 'configuration_error' } },
            promptTokens: 0, completionTokens: 0, latencyMs: 0,
          };
        }
      }

      const callResult = await (provider === 'anthropic'
        ? this.anthropic.complete({ ...req, model: m }, apiKey)
        : this.openai.complete({ ...req, model: m }, apiKey, path));

      // Accumulate managed usage for any successful managed call in the chain
      if (isManagedCall && callResult.status < 400) {
        const tokens = callResult.promptTokens + callResult.completionTokens;
        managedTokensUsed   += tokens;
        managedCostAccrued  += this.cost.calculateManaged(m, callResult.promptTokens, callResult.completionTokens, markupFactor);
      }

      return callResult;
    });

    const costUsd = this.cost.calculate(result.finalModel, result.promptTokens, result.completionTokens);
    const prov    = this.cost.getProvider(result.finalModel) ?? 'openai';

    await this.logs.write({ apiKeyId: ctx.apiKeyId, userId: ctx.userId, model: result.finalModel, provider: prov, status: result.status, latencyMs: result.latencyMs, promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd, path, isTestMode: false });

    // Cache successful deterministic responses for future deduplication
    if (cacheKey && result.status === 200) {
      void this.cache.set(cacheKey, {
        body:             result.body,
        promptTokens:     result.promptTokens,
        completionTokens: result.completionTokens,
        model:            result.finalModel,
        provider:         prov,
      } satisfies CachedResponse, CACHE_TTL_SECS);
    }

    // BYOK overage: charge flat routing fee only when no managed key was used.
    // Managed calls are already billed per-token — no second flat charge.
    if (isPaygOverage && managedTokensUsed === 0) {
      void this.billing.markPaygRequest(ctx.userId);
    }

    // Persist managed token usage for billing (fire-and-forget)
    if (managedTokensUsed > 0) {
      void this.billing.incrementManagedUsage(ctx.userId, managedTokensUsed, managedCostAccrued);
    }

    void this.firebase.writeUserPulse(ctx.userId, {
      lastRequestAt:   new Date(),
      latestStatus:    result.status,
      latestModel:     result.finalModel,
      latestLatencyMs: result.latencyMs,
      latestCostUsd:   costUsd,
      isTestMode:      false,
      dailyCalls:      0,
      dailyCostUsd:    0,
      errorRate:       0,
    });

    return result.body;
  }

  getModels() {
    return { object: 'list', data: this.cost.getSupportedModels() };
  }
}
