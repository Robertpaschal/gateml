import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: { emails: { send: (p: object) => Promise<unknown> } } | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const key = this.config.get<string>('RESEND_API_KEY');
    if (key) {
      const { Resend } = await import('resend');
      this.resend = new Resend(key) as unknown as typeof this.resend;
      this.logger.log('Email service ready (Resend)');
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    }
  }

  private get from() {
    return this.config.get<string>('EMAIL_FROM') ?? 'GateML <noreply@gateml.com>';
  }

  private get adminEmail() {
    return this.config.get<string>('ADMIN_EMAIL') ?? 'team@gateml.com';
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Email send failed to ${to}: ${err}`);
    }
  }

  // ── Transactional templates ────────────────────────────────────────────────

  sendWelcome(to: string, name: string | null) {
    return this.send(
      to,
      'Welcome to GateML — your keys are ready',
      `<p>Hi ${name ?? 'there'},</p>
<p>Your GateML account is set up. You now have a <strong>test key</strong> (free, synthetic responses) and a <strong>live key</strong> (routes to real LLMs).</p>
<p>Head to your <a href="${this.config.get('APP_URL') ?? 'https://app.gateml.com'}/dashboard">dashboard</a> to get started.</p>
<p>— The GateML team</p>`,
    );
  }

  sendQuotaWarning(to: string, name: string | null, used: number, limit: number) {
    const pct = Math.round((used / limit) * 100);
    return this.send(
      to,
      `GateML: you've used ${pct}% of your monthly quota`,
      `<p>Hi ${name ?? 'there'},</p>
<p>You've used <strong>${used.toLocaleString()} of ${limit.toLocaleString()} requests</strong> (${pct}%) this month.</p>
<p><a href="${this.config.get('APP_URL') ?? 'https://app.gateml.com'}/dashboard/billing">Upgrade to Pro</a> for 30× more requests and priority support.</p>
<p>— The GateML team</p>`,
    );
  }

  sendQuotaExceeded(to: string, name: string | null) {
    return this.send(
      to,
      'GateML: monthly quota reached',
      `<p>Hi ${name ?? 'there'},</p>
<p>Your monthly request quota is exhausted. Live gateway calls will return 402 until your quota resets or you upgrade.</p>
<p><a href="${this.config.get('APP_URL') ?? 'https://app.gateml.com'}/dashboard/billing">Upgrade now</a> or enable pay-as-you-go in your billing settings.</p>
<p>— The GateML team</p>`,
    );
  }

  sendPlanUpgraded(to: string, name: string | null, plan: string) {
    return this.send(
      to,
      `GateML: you're now on ${plan}`,
      `<p>Hi ${name ?? 'there'},</p>
<p>Your plan has been upgraded to <strong>${plan}</strong>. Your higher request limits and extended log retention are active immediately.</p>
<p>— The GateML team</p>`,
    );
  }

  sendSupportConfirmation(to: string, name: string, subject: string) {
    return this.send(
      to,
      `[GateML Support] We received your message: "${subject}"`,
      `<p>Hi ${name},</p>
<p>Thanks for reaching out. We've received your message and will reply within 1–2 business days.</p>
<p>— The GateML team</p>`,
    );
  }

  notifyAdminNewMessage(
    fromEmail: string,
    fromName: string,
    subject: string,
    body: string,
    company?: string,
    category?: string,
  ) {
    const tag    = category === 'ENTERPRISE_LEAD' ? '🏢 LEAD' : category === 'GENERAL' ? 'ℹ General' : '🎫 Support';
    const prefix = category === 'ENTERPRISE_LEAD' ? '[LEAD]' : '[Support]';
    return this.send(
      this.adminEmail,
      `${prefix} ${fromName}${company ? ` (${company})` : ''}: ${subject}`,
      `<p><strong>Category:</strong> ${tag}</p>
<p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;${company ? ` · <strong>Company:</strong> ${company}` : ''}</p>
<p><strong>Subject:</strong> ${subject}</p>
<hr/>
<p>${body.replace(/\n/g, '<br/>')}</p>`,
    );
  }

  notifyAdminNewUser(email: string, name: string | null, provider: string) {
    return this.send(
      this.adminEmail,
      `[GateML] New signup: ${email}`,
      `<p>New user signed up via <strong>${provider}</strong>.</p>
<p><strong>Email:</strong> ${email}<br/><strong>Name:</strong> ${name ?? '—'}</p>`,
    );
  }
}
