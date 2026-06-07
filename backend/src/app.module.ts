import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule }         from './prisma/prisma.module';
import { FirebaseAdminModule }  from './firebase/firebase-admin.module';  // ← Global
import { CommonModule }         from './common/common.module';             // ← Global
import { AuthModule }           from './auth/auth.module';
import { UsersModule }          from './users/users.module';
import { ApiKeysModule }        from './api-keys/api-keys.module';
import { ProviderKeysModule }   from './provider-keys/provider-keys.module';
import { RoutingModule }        from './routing/routing.module';
import { GatewayModule }        from './gateway/gateway.module';
import { LogsModule }           from './logs/logs.module';
import { StatsModule }          from './stats/stats.module';
import { PromptsModule }        from './prompts/prompts.module';
import { NotificationsModule }  from './notifications/notifications.module';
import { SystemModule }         from './system/system.module';
import { BillingModule }        from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Global providers (PrismaService, FirebaseAdminService, EncryptionService, TokenCostService)
    PrismaModule,
    FirebaseAdminModule,
    CommonModule,

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
  ],
})
export class AppModule {}
