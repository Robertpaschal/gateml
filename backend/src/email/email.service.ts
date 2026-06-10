import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { InjectQueue }        from '@nestjs/bullmq';
import { Queue }              from 'bullmq';
import * as Handlebars        from 'handlebars';
import * as fs                from 'fs';
import * as path              from 'path';
import { EMAIL_QUEUE, EMAIL_JOB, EmailJobData } from './email.queue';

const TEMPLATE_DIR = path.join(__dirname, 'templates');
const LAYOUT_PATH  = path.join(TEMPLATE_DIR, 'layouts', 'base.hbs');

// ── Transport abstraction ─────────────────────────────────────────────────────

interface EmailTransport {
  send(from: string, to: string, subject: string, html: string, attachments?: Attachment[]): Promise<void>;
}

interface Attachment {
  filename:    string;
  content:     Buffer;
  contentType: string;
}

class ResendTransport implements EmailTransport {
  private resendClient: any = null;
  constructor(private readonly apiKey: string) {}

  private async getClient() {
    if (!this.resendClient) {
      const { Resend } = await import('resend');
      this.resendClient = new Resend(this.apiKey);
    }
    return this.resendClient;
  }

  async send(from: string, to: string, subject: string, html: string, attachments?: Attachment[]) {
    const resend = await this.getClient();
    const result = await resend.emails.send({
      from, to, subject, html,
      ...(attachments?.length ? { attachments: attachments.map(a => ({
        filename: a.filename,
        content:  a.content.toString('base64'),
      })) } : {}),
    });
    if (result?.error) throw new Error(result.error.message);
  }
}

class SesTransport implements EmailTransport {
  private region: string;
  constructor(region: string) { this.region = region; }

  async send(from: string, to: string, subject: string, html: string, attachments?: Attachment[]) {
    const { SESv2Client, SendEmailCommand } = await import('@aws-sdk/client-sesv2');
    const ses = new SESv2Client({ region: this.region });

    if (attachments?.length) {
      // SESv2 supports raw MIME via Content.Raw.Data
      const boundary = `----=_Part_${Date.now()}`;
      const mime = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: quoted-printable`,
        '',
        html,
        '',
        ...attachments.flatMap(a => [
          `--${boundary}`,
          `Content-Type: ${a.contentType}; name="${a.filename}"`,
          `Content-Transfer-Encoding: base64`,
          `Content-Disposition: attachment; filename="${a.filename}"`,
          '',
          a.content.toString('base64'),
          '',
        ]),
        `--${boundary}--`,
      ].join('\r\n');

      await ses.send(new SendEmailCommand({ Content: { Raw: { Data: Buffer.from(mime) } } }));
      return;
    }

    await ses.send(new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body:    { Html: { Data: html, Charset: 'UTF-8' } },
        },
      },
    }));
  }
}

class ConsoleTransport implements EmailTransport {
  private readonly logger = new Logger('EmailConsole');
  async send(_from: string, to: string, subject: string, _html: string, attachments?: Attachment[]) {
    this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}${attachments?.length ? ` | Attachments: ${attachments.map(a => a.filename).join(', ')}` : ''}`);
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transport: EmailTransport = new ConsoleTransport();
  private layoutTemplate: Handlebars.TemplateDelegate | null = null;
  private templateCache = new Map<string, Handlebars.TemplateDelegate>();

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(EMAIL_QUEUE) private readonly queue: Queue<EmailJobData>,
  ) {}

  async onModuleInit() {
    this.transport = this.buildTransport();
    this.loadLayout();
    // Wire processor back-reference (avoids circular DI)
    // The processor module will set emailService = this after construction
  }

  private buildTransport(): EmailTransport {
    const provider = (this.config.get<string>('EMAIL_PROVIDER') ?? 'resend').toLowerCase();
    if (provider === 'ses') {
      const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
      this.logger.log(`Email transport: Amazon SES (${region})`);
      return new SesTransport(region);
    }
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    if (resendKey) {
      this.logger.log('Email transport: Resend');
      return new ResendTransport(resendKey);
    }
    this.logger.warn('No email transport configured — emails logged to console only');
    return new ConsoleTransport();
  }

  private loadLayout() {
    try {
      const src = fs.readFileSync(LAYOUT_PATH, 'utf8');
      this.layoutTemplate = Handlebars.compile(src);
    } catch {
      this.logger.warn(`Email layout not found at ${LAYOUT_PATH}`);
    }
  }

  private getTemplate(name: string): Handlebars.TemplateDelegate {
    if (this.templateCache.has(name)) return this.templateCache.get(name)!;
    const filePath = path.join(TEMPLATE_DIR, `${name}.hbs`);
    const src      = fs.readFileSync(filePath, 'utf8');
    const compiled = Handlebars.compile(src);
    this.templateCache.set(name, compiled);
    return compiled;
  }

  private renderTemplate(name: string, context: Record<string, unknown>): string {
    const bodyFn = this.getTemplate(name);
    const body   = bodyFn(context);
    if (!this.layoutTemplate) return body;
    return this.layoutTemplate({
      body,
      subject:  context['subject'] ?? '',
      appUrl:   this.appUrl,
      adminUrl: this.adminUrl,
      docsUrl:  `${this.appUrl}/docs`,
      year:     new Date().getFullYear(),
      ...context,
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Enqueue a transactional email (rendered from Handlebars template). */
  enqueue(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
    attachments?: Attachment[],
  ) {
    this.queue
      .add(EMAIL_JOB.SEND, { to, subject, template, context, attachments })
      .catch(err => this.logger.error(`Failed to enqueue email to ${to}: ${err}`));
  }

  /** Called by the BullMQ processor — renders and delivers. */
  async deliverRendered(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
    attachments?: Attachment[],
  ): Promise<void> {
    const html = this.renderTemplate(template, { ...context, subject });
    await this.deliverRaw(to, subject, html, attachments);
  }

  /** Deliver pre-rendered HTML directly (used for campaigns). */
  async deliverRaw(to: string, subject: string, html: string, attachments?: Attachment[]): Promise<void> {
    await this.transport.send(this.from, to, subject, html, attachments);
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  private get from()       { return this.config.get<string>('EMAIL_FROM')         ?? 'GateML <noreply@gateml.com>'; }
  private get appUrl()     { return this.config.get<string>('APP_URL')            ?? 'https://app.gateml.com'; }
  private get adminUrl()   { return this.config.get<string>('ADMIN_FRONTEND_URL') ?? 'https://admin.gateml.com'; }
  private get adminEmail() { return this.config.get<string>('ADMIN_EMAIL')        ?? 'team@gateml.com'; }

  // ── Transactional helpers ─────────────────────────────────────────────────

  sendWelcome(to: string, name: string | null) {
    this.enqueue(to, 'Welcome to GateML — your keys are ready', 'welcome', {
      name: name ?? 'there',
      dashboardUrl: `${this.appUrl}/dashboard`,
      docsUrl:      `${this.appUrl}/docs`,
    });
  }

  sendEmailVerification(to: string, name: string | null, verifyUrl: string) {
    this.enqueue(to, 'Verify your GateML email address', 'email-verification', {
      name: name ?? 'there', verifyUrl,
    });
  }

  sendPasswordReset(to: string, name: string | null, resetUrl: string) {
    this.enqueue(to, 'Reset your GateML password', 'password-reset', {
      name: name ?? 'there', resetUrl,
    });
  }

  sendQuotaWarning(to: string, name: string | null, used: number, limit: number, plan = 'FREE') {
    const pct = Math.round((used / limit) * 100);
    this.enqueue(to, `GateML: you've used ${pct}% of your monthly quota`, 'quota-warning', {
      name: name ?? 'there', used: used.toLocaleString(), limit: limit.toLocaleString(), pct, plan,
      billingUrl: `${this.appUrl}/dashboard/billing`,
    });
  }

  sendQuotaExceeded(to: string, name: string | null, limit: number, plan = 'FREE') {
    this.enqueue(to, 'GateML: monthly quota reached', 'quota-exceeded', {
      name: name ?? 'there', limit: limit.toLocaleString(), plan,
      billingUrl: `${this.appUrl}/dashboard/billing`,
    });
  }

  sendTrialEnding(to: string, name: string | null, trialEndAt: Date) {
    const endDate = trialEndAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    this.enqueue(to, `Your GateML trial ends ${endDate} — add a payment method to keep Pro`, 'trial-ending', {
      name: name ?? 'there',
      endDate,
      billingUrl: `${this.appUrl}/dashboard/billing`,
    });
  }

  sendPaymentFailed(to: string, name: string | null) {
    this.enqueue(to, 'GateML: payment failed — your plan has been downgraded to Free', 'payment-failed', {
      name: name ?? 'there',
      billingUrl: `${this.appUrl}/dashboard/billing`,
    });
  }

  sendPaymentAttemptFailed(to: string, name: string | null, attemptCount: number, amountDue?: string) {
    this.enqueue(to, 'GateML: payment failed — please update your payment method', 'payment-attempt-failed', {
      name: name ?? 'there',
      attemptCount,
      amountDue: amountDue ?? null,
      billingUrl: `${this.appUrl}/dashboard/billing`,
    });
  }

  sendRefundConfirmation(to: string, name: string | null, amount: string, reason?: string) {
    this.enqueue(to, 'GateML: refund processed', 'refund', {
      name: name ?? 'there',
      amount,
      reason:     reason ?? null,
      billingUrl: `${this.appUrl}/dashboard/billing`,
    });
  }

  sendPlanUpgraded(to: string, name: string | null, plan: string) {
    this.enqueue(to, `GateML: you're now on ${plan}`, 'plan-upgraded', {
      name: name ?? 'there', plan, isPro: plan === 'PRO',
      dashboardUrl: `${this.appUrl}/dashboard`,
    });
  }

  sendSupportConfirmation(to: string, name: string, subject: string, messageId: string) {
    this.enqueue(to, `[GateML Support] We received your message: "${subject}"`, 'support-confirmation', {
      name, subject, messageId, docsUrl: `${this.appUrl}/docs`,
    });
  }

  sendSupportReply(to: string, name: string, subject: string, replyBody: string, messageId: string) {
    this.enqueue(to, `Re: ${subject}`, 'support-reply', {
      name, subject, replyBody, messageId, dashboardUrl: `${this.appUrl}/dashboard`,
    });
  }

  notifyAdminNewMessage(
    fromEmail: string, fromName: string, subject: string, body: string,
    messageId: string, company?: string, category = 'SUPPORT',
  ) {
    const categoryMap: Record<string, { label: string; badge: string; prefix: string }> = {
      ENTERPRISE_LEAD: { label: 'Enterprise Lead', badge: 'badge-yellow', prefix: '[LEAD]' },
      GENERAL:         { label: 'General',          badge: 'badge-purple', prefix: '[General]' },
      SUPPORT:         { label: 'Support',           badge: 'badge-green',  prefix: '[Support]' },
    };
    const cat = categoryMap[category] ?? categoryMap['SUPPORT'];
    this.enqueue(
      this.adminEmail,
      `${cat.prefix} ${fromName}${company ? ` (${company})` : ''}: ${subject}`,
      'admin-new-message',
      { fromEmail, fromName, subject, body, messageId, company, categoryLabel: cat.label, categoryBadge: cat.badge, adminUrl: this.adminUrl },
    );
  }

  notifyAdminNewUser(email: string, name: string | null, provider: string) {
    this.enqueue(this.adminEmail, `[GateML] New signup: ${email}`, 'admin-new-user', {
      email, name: name ?? '—', provider, adminUrl: this.adminUrl,
    });
  }

  sendAdminInvite(to: string, name: string, role: string, acceptUrl: string, inviterName: string) {
    this.enqueue(to, "You've been invited to GateML Admin", 'admin-invite', {
      name, role, acceptUrl, inviterName,
    });
  }

  /** Custom message from admin to a specific user. */
  sendAdminCustomMessage(to: string, name: string, subject: string, body: string, adminName: string) {
    this.enqueue(to, subject, 'admin-custom-message', {
      name: name ?? 'there', subject, body, adminName,
      dashboardUrl: `${this.appUrl}/dashboard`,
    });
  }

  /** Payment invoice with optional PDF attachment. */
  sendInvoice(
    to: string,
    name: string | null,
    invoiceData: {
      invoiceId:    string;
      plan:         string;
      amount:       string;
      periodStart:  string;
      periodEnd:    string;
      date:         string;
    },
    pdfBuffer?: Buffer,
  ) {
    const context     = { name: name ?? 'there', ...invoiceData, billingUrl: `${this.appUrl}/dashboard/billing` };
    const attachments = pdfBuffer
      ? [{ filename: `invoice-${invoiceData.invoiceId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      : undefined;
    if (attachments) {
      this.enqueue(to, `GateML Invoice — ${invoiceData.plan} Plan`, 'invoice', context, attachments);
    } else {
      this.enqueue(to, `GateML Invoice — ${invoiceData.plan} Plan`, 'invoice', context);
    }
  }
}
