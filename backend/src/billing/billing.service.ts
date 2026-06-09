import { Injectable, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService }   from '@nestjs/config';
import { PrismaService }   from '../prisma/prisma.service';
import { EmailService }    from '../email/email.service';
import { PdfService }      from '../pdf/pdf.service';
import { Plan }            from '@prisma/client';
import { PLAN_LIMITS, PlanKey } from './plan-limits';
import StripeLib from 'stripe';

type StripeClient = InstanceType<typeof StripeLib>;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "2026-06"
}

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);
  private stripe: StripeClient | null = null;
  private configCache: { data: BillingConfigData; expiresAt: number } | null = null;

  constructor(
    private readonly prisma:  PrismaService,
    private readonly config:  ConfigService,
    private readonly email:   EmailService,
    private readonly pdf:     PdfService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) this.stripe = new StripeLib(key, { apiVersion: '2026-05-27.dahlia' });
  }

  async onModuleInit() {
    await this.ensureConfigExists();
    await this.seedDefaultProducts();
  }

  // ── Config ────────────────────────────────────────────────────────────────

  private async ensureConfigExists(): Promise<void> {
    await this.prisma.billingConfig.upsert({
      where:  { id: 'global' },
      update: {},
      create: { id: 'global', trialDays: 7, paygRateProUsd: 0.001, paygRateFreeUsd: 0.002, managedMarkupPercent: 20 },
    });
  }

  async getPublicConfig() {
    const cfg = await this.getConfig();
    return {
      trialDays:            cfg.trialDays,
      paygRateFreeUsd:      cfg.paygRateFreeUsd,
      paygRateProUsd:       cfg.paygRateProUsd,
      managedMarkupPercent: cfg.managedMarkupPercent,
    };
  }

  async getConfig(): Promise<BillingConfigData> {
    const now = Date.now();
    if (this.configCache && this.configCache.expiresAt > now) {
      return this.configCache.data;
    }
    const cfg = await this.prisma.billingConfig.upsert({
      where:  { id: 'global' },
      update: {},
      create: { id: 'global', trialDays: 7, paygRateProUsd: 0.001, paygRateFreeUsd: 0.002, managedMarkupPercent: 20 },
    });
    this.configCache = { data: cfg, expiresAt: now + 5 * 60 * 1000 };
    return cfg;
  }

  async updateBillingConfig(data: Partial<Omit<BillingConfigData, 'id' | 'updatedAt'>>) {
    this.configCache = null;
    return this.prisma.billingConfig.update({ where: { id: 'global' }, data });
  }

  // ── Products ──────────────────────────────────────────────────────────────

  private async seedDefaultProducts(): Promise<void> {
    const priceMonthly = this.config.get<string>('STRIPE_PRICE_PRO_MONTHLY');
    const priceAnnual  = this.config.get<string>('STRIPE_PRICE_PRO_ANNUAL');
    const cfg          = await this.getConfig();

    const seedPlan = async (
      stripePriceId: string,
      defaults: { name: string; interval: string; amountCents: number },
    ) => {
      let amountCents     = defaults.amountCents;
      let stripeProductId: string | null = null;

      // Sync real amount + product ID from Stripe so DB never drifts
      if (this.stripe) {
        try {
          const p = await this.stripe.prices.retrieve(stripePriceId);
          amountCents     = p.unit_amount ?? defaults.amountCents;
          stripeProductId = typeof p.product === 'string' ? p.product : null;
        } catch { /* keep defaults if Stripe unavailable */ }
      }

      await this.prisma.billingProduct.upsert({
        where:  { stripePriceId },
        update: { isActive: true, amountCents, ...(stripeProductId ? { stripeProductId } : {}) },
        create: {
          name:           defaults.name,
          stripePriceId,
          stripeProductId,
          planType:       Plan.PRO,
          interval:       defaults.interval,
          amountCents,
          currency:       'usd',
          trialDays:      cfg.trialDays,
          isPublic:       true,
          isActive:       true,
        },
      });
    };

    if (priceMonthly) await seedPlan(priceMonthly, { name: 'GateML Pro (Monthly)', interval: 'month', amountCents: 2900  });
    if (priceAnnual)  await seedPlan(priceAnnual,  { name: 'GateML Pro (Annual)',   interval: 'year',  amountCents: 29000 });
  }

  async getProducts() {
    const cfg      = await this.getConfig();
    const products = await this.prisma.billingProduct.findMany({
      where:   { isActive: true, isPublic: true },
      orderBy: { amountCents: 'asc' },
    });
    return products.map(p => ({
      ...p,
      trialDays: p.trialDays ?? cfg.trialDays,
    }));
  }

  async listAdminProducts() {
    return this.prisma.billingProduct.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { customAssignments: true } } },
    });
  }

  async createBillingProduct(data: CreateBillingProductInput, adminId?: string) {
    let stripeProductId = data.stripeProductId ?? null;
    let stripePriceId   = data.stripePriceId   ?? null;

    // When no price ID is supplied, create the product + price in Stripe automatically
    if (!stripePriceId) {
      if (!this.stripe) {
        throw new HttpException(
          'Stripe is not configured. Provide a stripePriceId or set STRIPE_SECRET_KEY.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const stripeProduct = await this.stripe.products.create({
        name:        data.name,
        ...(data.description ? { description: data.description } : {}),
        metadata: { planType: data.planType ?? 'PRO', source: 'gateml-admin' },
      });
      stripeProductId = stripeProduct.id;

      const stripePrice = await this.stripe.prices.create({
        product:     stripeProduct.id,
        currency:    data.currency ?? 'usd',
        unit_amount: data.amountCents,
        recurring:   { interval: (data.interval ?? 'month') as 'month' | 'year' },
        nickname:    data.name,
        metadata: { planType: data.planType ?? 'PRO', source: 'gateml-admin' },
      });
      stripePriceId = stripePrice.id;
    }

    return this.prisma.billingProduct.create({
      data: {
        name:           data.name,
        description:    data.description ?? null,
        stripeProductId,
        stripePriceId:  stripePriceId!,
        planType:       data.planType ?? Plan.PRO,
        interval:       data.interval ?? 'month',
        amountCents:    data.amountCents,
        currency:       data.currency ?? 'usd',
        isPublic:       data.isPublic ?? true,
        isActive:       data.isActive ?? true,
        trialDays:      data.trialDays ?? null,
        notes:          data.notes ?? null,
        createdBy:      adminId ?? null,
      },
    });
  }

  async toggleBillingProduct(id: string, isActive: boolean) {
    return this.prisma.billingProduct.update({ where: { id }, data: { isActive } });
  }

  async assignCustomPlan(userId: string, productId: string, notes?: string, adminId?: string) {
    return this.prisma.customPlanAssignment.upsert({
      where:  { userId },
      update: { productId, notes: notes ?? null, createdBy: adminId ?? null },
      create: { userId, productId, notes: notes ?? null, createdBy: adminId ?? null },
    });
  }

  async removeCustomAssignment(userId: string) {
    return this.prisma.customPlanAssignment.delete({ where: { userId } });
  }

  async listCustomAssignments() {
    return this.prisma.customPlanAssignment.findMany({
      include: { user: { select: { id: true, email: true, name: true } }, product: true },
      orderBy: { createdAt: 'desc' },
    });
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

  async checkQuota(userId: string): Promise<{ useManaged: boolean; isPaygOverage: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const lim = this.limits(user.plan).liveRequestsPerMonth;
    if (lim === -1) return { useManaged: user.useManaged, isPaygOverage: false }; // unlimited

    const { requests } = await this.getUsage(userId);

    if (requests === Math.floor(lim * 0.8)) {
      this.email.sendQuotaWarning(user.email, user.name, requests, lim, user.plan);
    }

    if (requests < lim) return { useManaged: user.useManaged, isPaygOverage: false };

    if (requests === lim) {
      this.email.sendQuotaExceeded(user.email, user.name, lim, user.plan);
    }

    if (user.payAsYouGo) return { useManaged: user.useManaged, isPaygOverage: true };

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

  async incrementUsage(userId: string, isPaygOverage = false): Promise<void> {
    const month = currentMonth();
    await this.prisma.usageRecord.upsert({
      where:  { userId_month: { userId, month } },
      update: {
        requests:      { increment: 1 },
        ...(isPaygOverage ? { paygRequests: { increment: 1 } } : {}),
        updatedAt:     new Date(),
      },
      create: {
        userId,
        month,
        requests:     1,
        paygRequests: isPaygOverage ? 1 : 0,
        updatedAt:    new Date(),
      },
    });
  }

  async incrementManagedUsage(userId: string, tokens: number, costUsd: number): Promise<void> {
    const month = currentMonth();
    await this.prisma.usageRecord.upsert({
      where:  { userId_month: { userId, month } },
      update: { tokensUsed: { increment: tokens }, managedCostUsd: { increment: costUsd }, updatedAt: new Date() },
      create: { userId, month, requests: 0, tokensUsed: tokens, managedCostUsd: costUsd, updatedAt: new Date() },
    });
  }

  /** Public promo code validation — safe to expose without auth. Does not increment usedCount. */
  async validatePromo(code: string): Promise<{ valid: boolean; discountPercent?: number; reason?: string }> {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      select: { isActive: true, discountPercent: true, validFrom: true, validUntil: true, maxUses: true, usedCount: true },
    });
    if (!promo || !promo.isActive) return { valid: false, reason: 'Code not found or inactive.' };
    const now = new Date();
    if (promo.validUntil && promo.validUntil < now) return { valid: false, reason: 'Code has expired.' };
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses!) return { valid: false, reason: 'Code usage limit reached.' };
    return { valid: true, discountPercent: promo.discountPercent };
  }

  async getManagedMarkupFactor(): Promise<number> {
    const cfg = await this.getConfig();
    return cfg.managedMarkupPercent / 100;
  }

  // ── Plan info ─────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where:   { id: userId },
      include: { subscription: true, customAssignment: { include: { product: true } } },
    });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const cfg    = await this.getConfig();
    const plan   = user.plan as PlanKey;
    const lim    = this.limits(user.plan);
    const month  = currentMonth();
    const record = await this.prisma.usageRecord.findUnique({
      where: { userId_month: { userId, month } },
    });

    const requests   = record?.requests ?? 0;
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    const nextReset  = new Date(monthStart);
    nextReset.setMonth(nextReset.getMonth() + 1);

    return {
      plan,
      payAsYouGo:            user.payAsYouGo,
      useManaged:            user.useManaged,
      limits:                lim,
      usage:                 { requests, month },
      managedUsage:          { tokensUsed: record?.tokensUsed ?? 0, costUsd: record?.managedCostUsd ?? 0 },
      nextResetAt:           nextReset,
      paygRateUsd:           plan === 'FREE' ? cfg.paygRateFreeUsd : cfg.paygRateProUsd,
      paygRateFreeUsd:       cfg.paygRateFreeUsd,
      paygRateProUsd:        cfg.paygRateProUsd,
      managedMarkupPercent:  cfg.managedMarkupPercent,
      trialEndAt:            user.subscription?.trialEndAt ?? null,
      customProduct:         user.customAssignment?.product ?? null,
      subscription:          user.subscription
        ? {
            status:            user.subscription.status,
            currentPeriodEnd:  user.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  // ── Stripe ────────────────────────────────────────────────────────────────

  async createCheckoutSession(
    userId:     string,
    priceId:    string,
    successUrl: string,
    cancelUrl:  string,
    promoCode?: string,
  ) {
    if (!this.stripe) throw new HttpException('Payments not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const product = await this.prisma.billingProduct.findUnique({ where: { stripePriceId: priceId } });
    if (!product || !product.isActive) {
      throw new HttpException('Invalid or inactive price', HttpStatus.BAD_REQUEST);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await this.stripe.customers.create({ email: user.email, metadata: { userId } });
      customerId = customer.id;
      await this.prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }

    const cfg       = await this.getConfig();
    const trialDays = product.trialDays ?? cfg.trialDays;

    // Resolve promo code to a Stripe coupon for server-side application.
    // When a coupon is applied server-side, allow_promotion_codes must be omitted
    // (Stripe doesn't allow both simultaneously).
    let appliedCouponId: string | null = null;
    if (promoCode) {
      const promo = await this.prisma.promoCode.findUnique({
        where:  { code: promoCode.toUpperCase().trim() },
        select: { isActive: true, stripeCouponId: true, validFrom: true, validUntil: true, maxUses: true, usedCount: true },
      });
      if (promo && promo.isActive && promo.stripeCouponId) {
        const now = new Date();
        const withinDates  = promo.validFrom <= now && (!promo.validUntil || promo.validUntil >= now);
        const underLimit   = promo.maxUses === null || promo.usedCount < promo.maxUses!;
        if (withinDates && underLimit) appliedCouponId = promo.stripeCouponId;
      }
    }

    const session = await this.stripe.checkout.sessions.create({
      customer:    customerId,
      mode:        'subscription',
      line_items:  [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      // Mutually exclusive: either apply a server-side coupon OR show the promo code input
      ...(appliedCouponId
        ? { discounts: [{ coupon: appliedCouponId }] }
        : { allow_promotion_codes: true }
      ),
      subscription_data: {
        metadata: { userId },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
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
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(obj);
        break;
      case 'invoice.upcoming':
        await this.handleInvoiceUpcoming(obj);
        break;
    }
  }

  private async handleInvoiceUpcoming(invoice: Record<string, unknown>) {
    if (!this.stripe) return;
    const customerId = invoice['customer'] as string;
    if (!customerId) return;

    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;

    const cfg   = await this.getConfig();
    const month = currentMonth();
    const rec   = await this.prisma.usageRecord.findUnique({
      where: { userId_month: { userId: user.id, month } },
    });

    if (!rec) return;

    const invoiceId   = invoice['id'] as string;
    const subId       = invoice['subscription'] as string;
    const plan        = user.plan as PlanKey;
    const paygRate    = plan === 'FREE' ? cfg.paygRateFreeUsd : cfg.paygRateProUsd;
    const markupFactor = cfg.managedMarkupPercent / 100;

    const unbilledPayg    = rec.paygRequests - rec.paygBilled;
    const unbilledManaged = rec.managedCostUsd - rec.managedBilled;

    let added = false;

    if (unbilledPayg > 0) {
      const amountUsd = unbilledPayg * paygRate;
      if (amountUsd >= 0.50) {
        await this.stripe.invoiceItems.create({
          customer:     customerId,
          subscription: subId,
          amount:       Math.round(amountUsd * 100),
          currency:     'usd',
          description:  `Pay-as-you-go overage: ${unbilledPayg} requests @ $${paygRate}/req`,
        });
        await this.prisma.usageRecord.update({
          where: { userId_month: { userId: user.id, month } },
          data:  { paygBilled: { increment: unbilledPayg } },
        });
        added = true;
      }
    }

    if (unbilledManaged > 0) {
      const managedFee = unbilledManaged * (1 + markupFactor) - unbilledManaged;
      if (managedFee >= 0.50) {
        await this.stripe.invoiceItems.create({
          customer:     customerId,
          subscription: subId,
          amount:       Math.round(managedFee * 100),
          currency:     'usd',
          description:  `Managed Keys markup: ${cfg.managedMarkupPercent}% on $${unbilledManaged.toFixed(4)} provider cost`,
        });
        await this.prisma.usageRecord.update({
          where: { userId_month: { userId: user.id, month } },
          data:  { managedBilled: { increment: unbilledManaged } },
        });
        added = true;
      }
    }

    if (added) {
      this.logger.log(`Added metered items to upcoming invoice ${invoiceId} for user ${user.id}`);
    }
  }

  private async handleInvoicePaid(invoice: Record<string, unknown>) {
    const customerId = invoice['customer'] as string;
    if (!customerId) return;

    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) return;

    // Track promo code usage. Stripe places the coupon on the invoice's `discount`
    // (or `discounts[]` in newer API versions). We match by stripeCouponId and
    // increment usedCount exactly once — safe because coupons use duration:'once'.
    try {
      const singleDiscount = invoice['discount'] as { coupon?: { id?: string } } | null;
      const multiDiscounts = invoice['discounts'] as Array<{ coupon?: { id?: string } }> | null;
      const couponIds = [
        singleDiscount?.coupon?.id,
        ...(multiDiscounts ?? []).map(d => d.coupon?.id),
      ].filter(Boolean) as string[];
      for (const couponId of couponIds) {
        await this.prisma.promoCode.updateMany({
          where: { stripeCouponId: couponId },
          data:  { usedCount: { increment: 1 }, updatedAt: new Date() },
        });
      }
    } catch (err) {
      this.logger.warn(`Promo usage tracking failed: ${err}`);
    }

    const amountCents = (invoice['amount_paid'] as number) ?? 0;
    const currency    = (invoice['currency']    as string) ?? 'usd';
    const invoiceId   = (invoice['id']          as string) ?? 'N/A';
    const periodStart = new Date(((invoice['period_start'] as number) ?? 0) * 1000);
    const periodEnd   = new Date(((invoice['period_end']   as number) ?? 0) * 1000);

    try {
      const pdfBuffer = await this.pdf.generateInvoice({
        invoiceId,
        customerName:  user.name ?? user.email,
        customerEmail: user.email,
        plan:          user.plan,
        amount:        amountCents,
        currency,
        periodStart,
        periodEnd,
        issuedAt:      new Date(),
      });

      this.email.sendInvoice(
        user.email,
        user.name,
        {
          invoiceId,
          plan:        user.plan,
          amount:      `$${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`,
          periodStart: periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          periodEnd:   periodEnd.toLocaleDateString('en-US',   { month: 'short', day: 'numeric', year: 'numeric' }),
          date:        new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        },
        pdfBuffer,
      );
    } catch (err) {
      this.logger.warn(`Invoice PDF generation failed for user ${user.id}: ${err}`);
      this.email.sendInvoice(user.email, user.name, {
        invoiceId, plan: user.plan,
        amount:      `$${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`,
        periodStart: periodStart.toLocaleDateString(),
        periodEnd:   periodEnd.toLocaleDateString(),
        date:        new Date().toLocaleDateString(),
      });
    }
  }

  private async syncSubscription(sub: Record<string, unknown>) {
    const metadata = sub.metadata as Record<string, string> | undefined;
    const userId   = metadata?.userId;
    if (!userId) return;

    const status   = sub.status as string;
    const isActive = ['active', 'trialing'].includes(status);
    const priceId  = (sub.items as { data: Array<{ price: { id: string } }> })?.data?.[0]?.price?.id ?? '';

    // Resolve correct plan type from our product catalog — handles Enterprise custom plans
    const catalogProduct = priceId
      ? await this.prisma.billingProduct.findUnique({ where: { stripePriceId: priceId }, select: { planType: true } })
      : null;
    const plan: Plan = isActive ? ((catalogProduct?.planType as Plan) ?? Plan.PRO) : Plan.FREE;

    const periodStart = new Date((sub.current_period_start as number) * 1000);
    const periodEnd   = new Date((sub.current_period_end   as number) * 1000);
    const trialEndRaw = sub.trial_end as number | null;
    const trialEndAt  = trialEndRaw ? new Date(trialEndRaw * 1000) : null;

    const prevUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { plan: true, email: true, name: true } });
    await this.prisma.user.update({ where: { id: userId }, data: { plan } });

    if (prevUser && prevUser.plan !== plan && isActive) {
      this.email.sendPlanUpgraded(prevUser.email, prevUser.name, plan);
    }

    await this.prisma.subscription.upsert({
      where:  { stripeSubId: sub.id as string },
      update: {
        status,
        stripePriceId:      priceId,
        currentPeriodStart: periodStart,
        currentPeriodEnd:   periodEnd,
        cancelAtPeriodEnd:  sub.cancel_at_period_end as boolean,
        trialEndAt,
        updatedAt:          new Date(),
      },
      create: {
        userId,
        stripeSubId:        sub.id as string,
        stripePriceId:      priceId,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd:   periodEnd,
        cancelAtPeriodEnd:  sub.cancel_at_period_end as boolean,
        trialEndAt,
        updatedAt:          new Date(),
      },
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

  async toggleManaged(userId: string, enabled: boolean) {
    return this.prisma.user.update({
      where:  { id: userId },
      data:   { useManaged: enabled },
      select: { useManaged: true },
    });
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BillingConfigData {
  id:                   string;
  trialDays:            number;
  paygRateProUsd:       number;
  paygRateFreeUsd:      number;
  managedMarkupPercent: number;
  updatedAt:            Date;
}

export interface CreateBillingProductInput {
  name:             string;
  description?:     string | null;
  stripeProductId?: string | null;
  stripePriceId?:   string | null; // omit to auto-create in Stripe
  planType?:       Plan;
  interval?:       string;
  amountCents:     number;
  currency?:       string;
  isPublic?:       boolean;
  isActive?:       boolean;
  trialDays?:      number | null;
  notes?:          string | null;
}
