import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule }          from '@nestjs/config';
import { EventEmitterModule }    from '@nestjs/event-emitter';
import { PrismaModule }          from './prisma/prisma.module';
import { FirebaseAdminModule }   from './firebase/firebase-admin.module';
import { CommonModule }          from './common/common.module';
import { EmailModule }           from './email/email.module';
import { AuditModule }           from './audit/audit.module';
import { HealthModule }          from './health/health.module';
import { AuthModule }            from './auth/auth.module';
import { UsersModule }           from './users/users.module';
import { ApiKeysModule }         from './api-keys/api-keys.module';
import { ProviderKeysModule }    from './provider-keys/provider-keys.module';
import { RoutingModule }         from './routing/routing.module';
import { GatewayModule }         from './gateway/gateway.module';
import { LogsModule }            from './logs/logs.module';
import { StatsModule }           from './stats/stats.module';
import { PromptsModule }         from './prompts/prompts.module';
import { NotificationsModule }   from './notifications/notifications.module';
import { SystemModule }          from './system/system.module';
import { BillingModule }         from './billing/billing.module';
import { AdminAuthModule }       from './admin-auth/admin-auth.module';
import { AdminModule }           from './admin/admin.module';
import { SupportModule }         from './support/support.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Event bus — required by EmailService for async email dispatch
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),

    // Global providers
    PrismaModule,
    FirebaseAdminModule,
    CommonModule,
    EmailModule,
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

    // Admin
    AdminAuthModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
