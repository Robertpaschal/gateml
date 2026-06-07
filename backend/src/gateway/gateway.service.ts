import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService }        from '@nestjs/config';
import { OpenAIProxy }          from './proxy/openai.proxy';
import { AnthropicProxy }       from './proxy/anthropic.proxy';
import { FallbackService }      from './fallback/fallback.service';
import { MockService }          from './mock/mock.service';
import { ProviderKeysService }  from '../provider-keys/provider-keys.service';
import { RoutingService }       from '../routing/routing.service';
import { LogsService }          from '../logs/logs.service';
import { TokenCostService }     from '../common/token-cost.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { BillingService }       from '../billing/billing.service';
import { LLMProvider }          from '@prisma/client';
import { ApiKeyContext }         from '../auth/decorators/api-key-context.decorator';

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
    private readonly firebase:  FirebaseAdminService,
    private readonly billing:   BillingService,
    private readonly config:    ConfigService,
  ) {}

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

    // ── Quota check (also returns useManaged flag — avoids a second DB hit) ──
    const { useManaged } = await this.billing.checkQuota(ctx.userId);
    void this.billing.incrementUsage(ctx.userId);

    // ── Live mode: route + fallback ───────────────────────────────────────────
    const chain = await this.routing.getFallbackChain(ctx.userId);

    // Track managed-key usage across all fallback attempts
    let managedTokensUsed = 0;
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
          const masterKey = this.getManagedKey(provider);
          if (masterKey) {
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
        managedCostAccrued  += this.cost.calculateManaged(m, callResult.promptTokens, callResult.completionTokens);
      }

      return callResult;
    });

    const costUsd = this.cost.calculate(result.finalModel, result.promptTokens, result.completionTokens);
    const prov    = this.cost.getProvider(result.finalModel) ?? 'openai';

    await this.logs.write({ apiKeyId: ctx.apiKeyId, userId: ctx.userId, model: result.finalModel, provider: prov, status: result.status, latencyMs: result.latencyMs, promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd, path, isTestMode: false });

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
