import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger }        from '@nestjs/common';
import { Job }                   from 'bullmq';
import { EMAIL_QUEUE, EmailJobData, CAMPAIGN_EMAIL_QUEUE, CampaignEmailJobData } from './email.queue';
import { PrismaService }         from '../prisma/prisma.service';
import { EmailService }          from './email.service';

/**
 * Processes transactional email jobs from the BullMQ queue.
 * The EmailService enqueues; this processor renders + delivers.
 */
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(@Inject(EmailService) private readonly emailSvc: EmailService) { super(); }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, template, context, attachments } = job.data;
    try {
      await this.emailSvc.deliverRendered(to, subject, template, context, attachments as any);
      this.logger.debug(`Email delivered: [${template}] → ${to}`);
    } catch (err) {
      this.logger.error(`Email job ${job.id} failed (attempt ${job.attemptsMade + 1}): ${err}`);
      throw err; // BullMQ retries based on backoff config
    }
  }
}

/**
 * Processes bulk campaign emails from the marketing queue (lower priority).
 * Tracks per-campaign sent/failed counters in DB.
 */
@Processor(CAMPAIGN_EMAIL_QUEUE)
export class CampaignEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignEmailProcessor.name);

  constructor(
    @Inject(EmailService) private readonly emailSvc: EmailService,
    private readonly prisma: PrismaService,
  ) { super(); }

  async process(job: Job<CampaignEmailJobData>): Promise<void> {
    const { campaignId, to, subject, html } = job.data;
    try {
      await this.emailSvc.deliverRaw(to, subject, html);
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data:  { sentCount: { increment: 1 } },
      });
    } catch (err) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data:  { failedCount: { increment: 1 } },
      }).catch(() => {});
      this.logger.error(`Campaign email to ${to} failed: ${err}`);
      throw err;
    }
  }
}
