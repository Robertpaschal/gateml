import { Module }          from '@nestjs/common';
import { BullModule }      from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CampaignsService }    from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CAMPAIGN_EMAIL_QUEUE } from '../email/email.queue';
import { PrismaModule }         from '../prisma/prisma.module';
import { AuditModule }          from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    BullModule.registerQueueAsync({
      name:    CAMPAIGN_EMAIL_QUEUE,
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => {
        const url    = cfg.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const parsed = new URL(url);
        return { connection: { host: parsed.hostname, port: parseInt(parsed.port || '6379', 10), password: parsed.password || undefined } };
      },
      inject: [ConfigService],
    }),
  ],
  providers:   [CampaignsService],
  controllers: [CampaignsController],
  exports:     [CampaignsService],
})
export class CampaignsModule {}
