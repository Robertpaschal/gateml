import { Global, Module }          from '@nestjs/common';
import { BullModule }               from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService }             from './email.service';
import { EmailProcessor, CampaignEmailProcessor } from './email.processor';
import { EMAIL_QUEUE, CAMPAIGN_EMAIL_QUEUE }       from './email.queue';
import { PrismaModule }             from '../prisma/prisma.module';

const BACKOFF = { type: 'exponential' as const, delay: 2000 };

@Global()
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueueAsync(
      {
        name:    EMAIL_QUEUE,
        imports: [ConfigModule],
        useFactory: (cfg: ConfigService) => ({
          connection: redisOpts(cfg),
          defaultJobOptions: {
            attempts:         5,
            backoff:          BACKOFF,
            removeOnComplete: 200,
            removeOnFail:     500,
          },
        }),
        inject: [ConfigService],
      },
      {
        name:    CAMPAIGN_EMAIL_QUEUE,
        imports: [ConfigModule],
        useFactory: (cfg: ConfigService) => ({
          connection: redisOpts(cfg),
          defaultJobOptions: {
            attempts:         3,
            backoff:          BACKOFF,
            removeOnComplete: 100,
            removeOnFail:     300,
          },
        }),
        inject: [ConfigService],
      },
    ),
  ],
  providers: [EmailService, EmailProcessor, CampaignEmailProcessor],
  exports:   [EmailService],
})
export class EmailModule {}

function redisOpts(cfg: ConfigService) {
  const url = cfg.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
  const parsed = new URL(url);
  return {
    host:     parsed.hostname,
    port:     parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
  };
}
