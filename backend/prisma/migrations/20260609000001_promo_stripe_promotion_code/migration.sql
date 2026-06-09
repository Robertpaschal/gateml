-- Add stripePromotionCodeId to PromoCode so we can track the Stripe PromotionCode
-- object separately from the underlying Coupon. PromotionCodes are what users
-- type at checkout; Coupons are the underlying discount rule.

ALTER TABLE "PromoCode" ADD COLUMN IF NOT EXISTS "stripePromotionCodeId" TEXT;
