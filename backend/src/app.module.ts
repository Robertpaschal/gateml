import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule }         from './prisma/prisma.module';
import { FirebaseAdminModule }  from './firebase/firebase-admin.module';  // ← Global
import { CommonModule }         from './common/common.module';             // ← Global
import { EmailModule }          from './email/email.module';               // ← Global
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
import { AdminAuthModule }      from './admin-auth/admin-auth.module';
import { AdminModule }          from './admin/admin.module';
import { SupportModule }        from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Global providers (PrismaService, FirebaseAdminService, EncryptionService, TokenCostService, EmailService)
    PrismaModule,
    FirebaseAdminModule,
    CommonModule,
    EmailModule,

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
export class AppModule {}
