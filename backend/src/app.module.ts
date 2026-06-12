import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule }                from '@nestjs/bullmq';
import { EventEmitterModule }        from '@nestjs/event-emitter';
import { PrismaModule }              from './prisma/prisma.module';
import { FirebaseAdminModule }       from './firebase/firebase-admin.module';
import { CommonModule }              from './common/common.module';
import { EmailModule }               from './email/email.module';
import { PdfModule }                 from './pdf/pdf.module';
import { AuditModule }               from './audit/audit.module';
import { HealthModule }              from './health/health.module';
import { AuthModule }                from './auth/auth.module';
import { UsersModule }               from './users/users.module';
import { ApiKeysModule }             from './api-keys/api-keys.module';
import { ProviderKeysModule }        from './provider-keys/provider-keys.module';
import { RoutingModule }             from './routing/routing.module';
import { GatewayModule }             from './gateway/gateway.module';
import { LogsModule }                from './logs/logs.module';
import { StatsModule }               from './stats/stats.module';
import { PromptsModule }             from './prompts/prompts.module';
import { NotificationsModule }       from './notifications/notifications.module';
import { SystemModule }              from './system/system.module';
import { BillingModule }             from './billing/billing.module';
import { AdminAuthModule }           from './admin-auth/admin-auth.module';
import { AdminModule }               from './admin/admin.module';
import { SupportModule }             from './support/support.module';
import { CampaignsModule }           from './campaigns/campaigns.module';
import { PromosModule }              from './promos/promos.module';
import { UnsubscribeModule }         from './unsubscribe/unsubscribe.module';
import { CorrelationIdMiddleware }   from './common/middleware/correlation-id.middleware';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { APP_INTERCEPTOR }           from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // BullMQ root connection (shared across all queues)
    BullModule.forRootAsync({
      imports:    [ConfigModule],
      useFactory: (cfg: ConfigService) => {
        const url    = cfg.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const parsed = new URL(url);
        const tls    = parsed.protocol === 'rediss:' ? {} : undefined;
        return {
          connection: {
            host:     parsed.hostname,
            port:     parseInt(parsed.port || '6379', 10),
            password: parsed.password || undefined,
            ...(tls ? { tls } : {}),
          },
        };
      },
      inject: [ConfigService],
    }),

    // In-process event bus (kept for legacy; new emails go through BullMQ)
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),

    // Global providers
    PrismaModule,
    FirebaseAdminModule,
    CommonModule,
    EmailModule,
    PdfModule,
    AuditModule,

    // Observability
    HealthModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ApiKeysModule,
    ProviderKeysModule,
    RoutingModule,
    GatewayModule,
    LogsModule,
    StatsModule,
    PromptsModule,
    NotificationsModule,
    SystemModule,
    BillingModule,
    SupportModule,
    CampaignsModule,
    PromosModule,
    UnsubscribeModule,

    // Admin
    AdminAuthModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
