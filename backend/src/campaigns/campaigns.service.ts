import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectQueue }    from '@nestjs/bullmq';
import { Queue }          from 'bullmq';
import { ConfigService }  from '@nestjs/config';
import { PrismaService }  from '../prisma/prisma.service';
import { EmailService }   from '../email/email.service';
import { CampaignTarget } from '@prisma/client';
import { CAMPAIGN_EMAIL_QUEUE, CampaignEmailJobData } from '../email/email.queue';
import * as Handlebars    from 'handlebars';
import * as fs            from 'fs';
import * as path          from 'path';
import { createHmac }     from 'crypto';

const TEMPLATE_PATH = path.join(__dirname, '..', 'email', 'templates', 'campaign.hbs');
const LAYOUT_PATH   = path.join(__dirname, '..', 'email', 'templates', 'layouts', 'base.hbs');

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private campaignTemplate: Handlebars.TemplateDelegate | null = null;
  private layoutTemplate:   Handlebars.TemplateDelegate | null = null;

  constructor(
    private readonly prisma:  PrismaService,
    private readonly email:   EmailService,
    private readonly config:  ConfigService,
    @InjectQueue(CAMPAIGN_EMAIL_QUEUE) private readonly queue: Queue<CampaignEmailJobData>,
  ) {
    try {
      this.campaignTemplate = Handlebars.compile(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
      this.layoutTemplate   = Handlebars.compile(fs.readFileSync(LAYOUT_PATH, 'utf8'));
    } catch { /* will fall back to plain text if templates not found */ }
  }

  async create(data: {
    title:       string;
    subject:     string;
    body:        string;
    target:      CampaignTarget;
    scheduledAt?: Date;
    createdBy?:  string;
  }) {
    return this.prisma.campaign.create({ data: { ...data, updatedAt: new Date() } });
  }

  async list(page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { email: true, name: true } } },
      }),
      this.prisma.campaign.count(),
    ]);
    return { campaigns, total, page, pages: Math.ceil(total / limit) };
  }

  async get(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { admin: { select: { email: true, name: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    return campaign;
  }

  async update(id: string, data: Partial<{ title: string; subject: string; body: string; target: CampaignTarget; scheduledAt: Date | null }>) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    if (campaign.status === 'SENT') throw new BadRequestException('Cannot edit a sent campaign.');
    return this.prisma.campaign.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  }

  async delete(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    if (campaign.status === 'SENDING') throw new BadRequestException('Cannot delete a campaign that is currently sending.');
    return this.prisma.campaign.delete({ where: { id } });
  }

  /** Send the campaign immediately to all matching users. */
  async send(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    if (campaign.status === 'SENT')    throw new BadRequestException('Campaign already sent.');
    if (campaign.status === 'SENDING') throw new BadRequestException('Campaign is already sending.');

    // Mark as sending
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data:  { status: 'SENDING', updatedAt: new Date() },
    });

    // Fetch target users
    const where = this.targetWhere(campaign.target);
    const users = await this.prisma.user.findMany({
      where: { ...where, emailVerified: true },
      select: { email: true, name: true },
    });

    this.logger.log(`Sending campaign "${campaign.title}" to ${users.length} users`);

    const appUrl = this.config.get<string>('APP_URL') ?? 'https://app.gateml.com';

    // Enqueue one job per recipient with a per-user unsubscribe URL (HMAC-signed, no DB storage)
    const jobs = users.map(u => {
      const unsubscribeUrl = this.buildUnsubscribeUrl(u.email, appUrl);
      const html = this.renderCampaignHtml(campaign.subject, campaign.body, unsubscribeUrl, appUrl);
      return {
        name: 'send_campaign',
        data: { campaignId, to: u.email, subject: campaign.subject, html } as CampaignEmailJobData,
        opts: { priority: 10 },
      };
    });

    await this.queue.addBulk(jobs);

    // Mark sent when all jobs enqueued (actual counts updated by processor)
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data:  { status: 'SENT', sentAt: new Date(), updatedAt: new Date() },
    });

    return { queued: users.length };
  }

  private buildUnsubscribeUrl(email: string, appUrl: string): string {
    const secret = this.config.get<string>('UNSUBSCRIBE_SECRET') ?? 'gateml-unsub-secret';
    const token  = createHmac('sha256', secret).update(email).digest('hex');
    const e      = Buffer.from(email).toString('base64url');
    return `${appUrl}/unsubscribe?e=${e}&t=${token}`;
  }

  private targetWhere(target: CampaignTarget) {
    const base = { unsubscribedFromMarketing: false };
    if (target === 'ALL')        return base;
    if (target === 'FREE')       return { ...base, plan: 'FREE'       as const };
    if (target === 'PRO')        return { ...base, plan: 'PRO'        as const };
    if (target === 'ENTERPRISE') return { ...base, plan: 'ENTERPRISE' as const };
    return base;
  }

  private renderCampaignHtml(subject: string, body: string, unsubscribeUrl: string, appUrl: string): string {
    if (!this.campaignTemplate || !this.layoutTemplate) {
      return `<h2>${subject}</h2>${body}`;
    }
    const bodyHtml = this.campaignTemplate({ subject, body, unsubscribeUrl });
    return this.layoutTemplate({
      body: bodyHtml, subject, appUrl,
      year: new Date().getFullYear(), unsubscribeUrl,
    });
  }
}
