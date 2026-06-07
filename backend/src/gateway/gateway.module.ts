import { Module }            from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService }    from './gateway.service';
import { OpenAIProxy }       from './proxy/openai.proxy';
import { AnthropicProxy }    from './proxy/anthropic.proxy';
import { FallbackService }   from './fallback/fallback.service';
import { MockService }       from './mock/mock.service';
import { ApiKeysModule }     from '../api-keys/api-keys.module';
import { ProviderKeysModule }from '../provider-keys/provider-keys.module';
import { RoutingModule }     from '../routing/routing.module';
import { LogsModule }        from '../logs/logs.module';
import { BillingModule }     from '../billing/billing.module';

// FirebaseAdminModule is @Global() — no import needed

@Module({
  imports: [ApiKeysModule, ProviderKeysModule, RoutingModule, LogsModule, BillingModule],
  controllers: [GatewayController],
  providers:   [GatewayService, OpenAIProxy, AnthropicProxy, FallbackService, MockService],
})
export class GatewayModule {}
