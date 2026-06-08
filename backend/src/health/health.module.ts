import { Module }           from '@nestjs/common';
import { TerminusModule }   from '@nestjs/terminus';
import { BullModule }       from '@nestjs/bullmq';
import { EMAIL_QUEUE }      from '../email/email.queue';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
