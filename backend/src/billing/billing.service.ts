import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService }   from '@nestjs/config';
import { PrismaService }   from '../prisma/prisma.service';
import { Plan }            from '@prisma/client';
import { PLAN_LIMITS, PlanKey } from './plan-limits';
import StripeLib from 'stripe';

// Alias so we can use it both as a value (new StripeLib()) and type (InstanceType)
type StripeClient = InstanceType<typeof StripeLib>;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "2026-06"
}

@Injectable()
export class BillingService {
  private stripe: StripeClient | null = null;

  constructor(
    private readonly prisma:  PrismaService,
    private readonly config:  ConfigService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) this.stripe = new StripeLib(key, { apiVersion: '2026-05-27.dahlia' });
  }

  // ── Quota ─────────────────────────────────────────────────────────────────

  limits(plan: Plan) {
    return PLAN_LIMITS[plan as PlanKey] ?? PLAN_LIMITS.FREE;
  }

  async getUsage(userId: string): Promise<{ requests: number; month: string }> {
    const month  = currentMonth();
    const record = await this.prisma.usageRecord.findUnique({
      where: { userId_month: { userId, month } },
    });
    return { requests: record?.requests ?? 0, month };
  }

  /** Throws 402 if over quota with no PAYG. */
  async checkQuota(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const lim = this.limits(user.plan).liveRequestsPerMonth;
    if (lim === -1) return; // unlimited (Enterprise)

    const { requests } = await this.getUsage(userId);
    if (requests < lim) return;

    if (user.payAsYouGo) return;

    throw new HttpException(
      {
        statusCode:  402,
        error:       'quota_exceeded',
        message:     `Monthly limit of ${lim} requests reached. Upgrade or enable pay-as-you-go to continue.`,
        upgradeUrl:  '/dashboard/billing',
        plan:        user.plan,
        used:        requests,
        limit:       lim,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  async incrementUsage(userId: string): Promise<void> {
    const month = currentMonth();
    await this.prisma.usageRecord.upsert({
      where:  { userId_month: { userId, month } },
      update: { requests: { increment: 1 }, updatedAt: new Date() },
      create: { userId, month, requests: 1, updatedAt: new Date() },
    });
  }

  // ── Plan info ─────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where:   { id: userId },
      include: { subscription: true },
    });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const plan    = user.plan as PlanKey;
    const lim     = this.limits(user.plan);
    const { requests, month } = await this.getUsage(userId);

    const monthStart = new Date(`${month}-01T00:00:00Z`);
    const nextReset  = new Date(monthStart);
    nextReset.setMonth(nextReset.getMonth() + 1);

    return {
      plan,
      payAsYouGo:   user.payAsYouGo,
      limits:       lim,
      usage:        { requests, month },
      nextResetAt:  nextReset,
      subscription: user.subscription
        ? {
            status:            user.subscription.status,
            currentPeriodEnd:  user.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  // ── Stripe ────────────────────────────────────────────────────────────────

  async createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string) {
    if (!this.stripe) throw new HttpException('Payments not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await this.stripe.customers.create({ email: user.email, metadata: { userId } });
      customerId = customer.id;
      await this.prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer:              customerId,
      mode:                  'subscription',
      line_items:            [{ price: priceId, quantity: 1 }],
      success_url:           successUrl,
      cancel_url:            cancelUrl,
      allow_promotion_codes: true,
      subscription_data:     { metadata: { userId } },
    });

    return { url: session.url };
  }

  async createPortalSession(userId: string, returnUrl: string) {
    if (!this.stripe) throw new HttpException('Payments not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) throw new HttpException('No billing account found', HttpStatus.NOT_FOUND);

    const session = await this.stripe.billingPortal.sessions.create({
      customer:   user.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) throw new HttpException('Payments not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new HttpException('Webhook secret not configured', HttpStatus.SERVICE_UNAVAILABLE);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new HttpException('Invalid webhook signature', HttpStatus.BAD_REQUEST);
    }

    await this.processEvent(event);
    return { received: true };
  }

  private async processEvent(event: { type: string; data: { object: Record<string, unknown> } }) {
    const obj = event.data.object;
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscription(obj);
        break;
      case 'customer.subscription.deleted':
        await this.cancelSubscription(obj.id as string);
        break;
    }
  }

  private async syncSubscription(sub: Record<string, unknown>) {
    const metadata = sub.metadata as Record<string, string> | undefined;
    const userId   = metadata?.userId;
    if (!userId) return;

    const status      = sub.status as string;
    const isActive    = ['active', 'trialing'].includes(status);
    const plan: Plan  = isActive ? Plan.PRO : Plan.FREE;
    const priceId     = (sub.items as { data: Array<{ price: { id: string } }> })?.data?.[0]?.price?.id ?? '';
    const periodStart = new Date((sub.current_period_start as number) * 1000);
    const periodEnd   = new Date((sub.current_period_end   as number) * 1000);

    await this.prisma.user.update({ where: { id: userId }, data: { plan } });

    await this.prisma.subscription.upsert({
      where:  { stripeSubId: sub.id as string },
      update: { status, stripePriceId: priceId, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: sub.cancel_at_period_end as boolean, updatedAt: new Date() },
      create: { userId, stripeSubId: sub.id as string, stripePriceId: priceId, status, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: sub.cancel_at_period_end as boolean, updatedAt: new Date() },
    });
  }

  private async cancelSubscription(stripeSubId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { stripeSubId } });
    if (!sub) return;
    await this.prisma.subscription.update({ where: { stripeSubId }, data: { status: 'canceled', updatedAt: new Date() } });
    await this.prisma.user.update({ where: { id: sub.userId }, data: { plan: Plan.FREE } });
  }

  async togglePayAsYouGo(userId: string, enabled: boolean) {
    return this.prisma.user.update({
      where:  { id: userId },
      data:   { payAsYouGo: enabled },
      select: { payAsYouGo: true },
    });
  }
}
