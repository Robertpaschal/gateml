import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService }    from '@nestjs/config';
import { EventEmitter2 }    from '@nestjs/event-emitter';
import { OnEvent }          from '@nestjs/event-emitter';
import * as Handlebars      from 'handlebars';
import * as fs              from 'fs';
import * as path            from 'path';
import { EMAIL_SEND, EmailSendPayload } from './email.events';

const TEMPLATE_DIR = path.join(__dirname, 'templates');
const LAYOUT_PATH  = path.join(TEMPLATE_DIR, 'layouts', 'base.hbs');
const MAX_RETRIES  = 3;

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: { emails: { send: (p: object) => Promise<{ error?: { message: string } }> } } | null = null;
  private layoutTemplate: Handlebars.TemplateDelegate | null = null;
  private templateCache = new Map<string, Handlebars.TemplateDelegate>();

  constructor(
    private readonly config:  ConfigService,
    private readonly events:  EventEmitter2,
  ) {}

  async onModuleInit() {
    const key = this.config.get<string>('RESEND_API_KEY');
    if (key) {
      const { Resend } = await import('resend');
      this.resend = new Resend(key) as unknown as typeof this.resend;
      this.logger.log('Email service ready (Resend)');
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console');
    }
    this.loadLayout();
  }

  private loadLayout() {
    try {
      const src = fs.readFileSync(LAYOUT_PATH, 'utf8');
      this.layoutTemplate = Handlebars.compile(src);
    } catch (e) {
      this.logger.warn(`Email layout not found at ${LAYOUT_PATH} — falling back to plain HTML`);
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

    const baseCtx = {
      body,
      subject:  context['subject'] ?? '',
      appUrl:   this.appUrl,
      adminUrl: this.adminUrl,
      docsUrl:  `${this.appUrl}/docs`,
      year:     new Date().getFullYear(),
      ...context,
    };
    return this.layoutTemplate(baseCtx);
  }

  // ── Core send ──────────────────────────────────────────────────────────────

  /** Fire-and-forget: enqueue via EventEmitter for async delivery with retry. */
  enqueue(to: string, subject: string, template: string, context: Record<string, unknown>) {
    this.events.emit(EMAIL_SEND, { to, subject, template, context, retries: 0 } as EmailSendPayload);
  }

  @OnEvent(EMAIL_SEND, { async: true })
  async handleEmailSend(payload: EmailSendPayload) {
    const { to, subject, template, context, retries = 0 } = payload;
    try {
      const html = this.renderTemplate(template, { ...context, subject });
      await this.deliverRaw(to, subject, html);
    } catch (err) {
      if (retries < MAX_RETRIES) {
        const delay = 1000 * 2 ** retries; // 1s, 2s, 4s
        this.logger.warn(`Email to ${to} failed (attempt ${retries + 1}), retrying in ${delay}ms: ${err}`);
        setTimeout(
          () => this.events.emit(EMAIL_SEND, { ...payload, retries: retries + 1 }),
          delay,
        );
      } else {
        this.logger.error(`Email to ${to} failed after ${MAX_RETRIES} attempts: ${err}`);
      }
    }
  }

  /** Deliver immediately (used internally after template rendering). */
  async deliverRaw(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}`);
      return;
    }
    const result = await this.resend.emails.send({ from: this.from, to, subject, html });
    if ((result as any)?.error) {
      throw new Error((result as any).error.message);
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  private get from()     { return this.config.get<string>('EMAIL_FROM')         ?? 'GateML <noreply@gateml.com>'; }
  private get appUrl()   { return this.config.get<string>('APP_URL')            ?? 'https://app.gateml.com'; }
  private get adminUrl() { return this.config.get<string>('ADMIN_FRONTEND_URL') ?? 'https://admin.gateml.com'; }
  private get adminEmail() { return this.config.get<string>('ADMIN_EMAIL')      ?? 'team@gateml.com'; }

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
      name:      name ?? 'there',
      verifyUrl,
    });
  }

  sendPasswordReset(to: string, name: string | null, resetUrl: string) {
    this.enqueue(to, 'Reset your GateML password', 'password-reset', {
      name:     name ?? 'there',
      resetUrl,
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
      name, subject, replyBody, messageId,
      dashboardUrl: `${this.appUrl}/dashboard`,
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
    this.enqueue(to, 'You\'ve been invited to GateML Admin', 'admin-invite', {
      name, role, acceptUrl, inviterName,
    });
  }
}
