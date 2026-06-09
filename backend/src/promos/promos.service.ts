import {
  Injectable, Logger, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import StripeLib from 'stripe';

type StripeClient = InstanceType<typeof StripeLib>;

@Injectable()
export class PromosService {
  private readonly logger = new Logger(PromosService.name);
  private stripe: StripeClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) this.stripe = new StripeLib(key, { apiVersion: '2026-05-27.dahlia' });
  }

  async create(data: {
    code:            string;
    description?:    string;
    discountPercent: number;
    maxUses?:        number;
    validUntil?:     Date;
    createdBy?:      string;
  }) {
    const code = data.code.toUpperCase().trim();

    const existing = await this.prisma.promoCode.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Promo code "${code}" already exists.`);

    if (data.discountPercent < 1 || data.discountPercent > 100) {
      throw new BadRequestException('Discount must be between 1 and 100.');
    }

    let stripeCouponId:        string | undefined;
    let stripePromotionCodeId: string | undefined;

    if (this.stripe) {
      try {
        // Step 1: Create the underlying Coupon (discount rule)
        const coupon = await this.stripe.coupons.create({
          id:             `gml_${code}`,
          percent_off:    data.discountPercent,
          duration:       'once',
          name:           `GateML ${code} — ${data.discountPercent}% off`,
          max_redemptions: data.maxUses,
          redeem_by:       data.validUntil ? Math.floor(data.validUntil.getTime() / 1000) : undefined,
        });
        stripeCouponId = coupon.id;

        // Step 2: Create a PromotionCode so users can type it at Stripe Checkout.
        // allow_promotion_codes=true in the checkout session looks up PromotionCode objects,
        // NOT raw coupons. Both objects are needed.
        // This API version uses `promotion: { type: 'coupon', coupon: id }` instead of
        // a top-level `coupon` field.
        const promotionCode = await this.stripe.promotionCodes.create({
          promotion:       { type: 'coupon', coupon: coupon.id },
          code,
          max_redemptions: data.maxUses,
          expires_at:      data.validUntil ? Math.floor(data.validUntil.getTime() / 1000) : undefined,
        });
        stripePromotionCodeId = promotionCode.id;
      } catch (err) {
        this.logger.warn(`Stripe promo creation failed for ${code}: ${err} — promo stored locally only`);
      }
    }

    return this.prisma.promoCode.create({
      data: {
        code,
        description:          data.description,
        discountPercent:      data.discountPercent,
        stripeCouponId,
        stripePromotionCodeId,
        maxUses:              data.maxUses,
        validUntil:           data.validUntil,
        createdBy:            data.createdBy,
        updatedAt:            new Date(),
      },
    });
  }

  async list(page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const [codes, total] = await Promise.all([
      this.prisma.promoCode.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { email: true, name: true } } },
      }),
      this.prisma.promoCode.count(),
    ]);
    return { codes, total, page, pages: Math.ceil(total / limit) };
  }

  async get(id: string) {
    const code = await this.prisma.promoCode.findUnique({
      where: { id },
      include: { admin: { select: { email: true, name: true } } },
    });
    if (!code) throw new NotFoundException('Promo code not found.');
    return code;
  }

  async toggle(id: string, isActive: boolean) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promo code not found.');

    // Toggle the PromotionCode's active flag — this prevents/allows user-entered codes
    // at checkout without destroying the underlying coupon (which is irreversible).
    if (this.stripe && promo.stripePromotionCodeId) {
      try {
        await this.stripe.promotionCodes.update(promo.stripePromotionCodeId, { active: isActive });
      } catch (err) {
        this.logger.warn(`Stripe promotion code toggle failed for ${promo.code}: ${err}`);
      }
    }

    return this.prisma.promoCode.update({
      where: { id },
      data:  { isActive, updatedAt: new Date() },
    });
  }

  /** Validate a code (does not increment usedCount — that happens on invoice.payment_succeeded). */
  async validate(code: string): Promise<{
    valid: boolean;
    discountPercent: number;
    stripeCouponId: string | null;
    reason?: string;
  }> {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!promo)          return { valid: false, discountPercent: 0, stripeCouponId: null, reason: 'Code not found.' };
    if (!promo.isActive) return { valid: false, discountPercent: 0, stripeCouponId: null, reason: 'Code is inactive.' };

    const now = new Date();
    if (promo.validFrom  > now)                                         return { valid: false, discountPercent: 0, stripeCouponId: null, reason: 'Code not yet valid.' };
    if (promo.validUntil && promo.validUntil < now)                     return { valid: false, discountPercent: 0, stripeCouponId: null, reason: 'Code has expired.' };
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses!)    return { valid: false, discountPercent: 0, stripeCouponId: null, reason: 'Code has reached its usage limit.' };

    return { valid: true, discountPercent: promo.discountPercent, stripeCouponId: promo.stripeCouponId };
  }

  async recordUse(stripeCouponId: string) {
    await this.prisma.promoCode.updateMany({
      where: { stripeCouponId, isActive: true },
      data:  { usedCount: { increment: 1 }, updatedAt: new Date() },
    });
  }
}
