-- AddColumn: trialEndAt to Subscription
ALTER TABLE "Subscription" ADD COLUMN "trialEndAt" TIMESTAMP(3);

-- AddColumns: PAYG billing tracking to UsageRecord
ALTER TABLE "UsageRecord" ADD COLUMN "paygRequests" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UsageRecord" ADD COLUMN "paygBilled"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UsageRecord" ADD COLUMN "managedBilled" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable: BillingProduct
CREATE TABLE "BillingProduct" (
    "id"              TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "stripeProductId" TEXT,
    "stripePriceId"   TEXT NOT NULL,
    "planType"        "Plan" NOT NULL DEFAULT 'PRO',
    "interval"        TEXT NOT NULL DEFAULT 'month',
    "amountCents"     INTEGER NOT NULL,
    "currency"        TEXT NOT NULL DEFAULT 'usd',
    "isPublic"        BOOLEAN NOT NULL DEFAULT true,
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "trialDays"       INTEGER,
    "notes"           TEXT,
    "createdBy"       TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingProduct_stripePriceId_key" ON "BillingProduct"("stripePriceId");
CREATE INDEX "BillingProduct_isActive_isPublic_idx" ON "BillingProduct"("isActive", "isPublic");

-- CreateTable: CustomPlanAssignment
CREATE TABLE "CustomPlanAssignment" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "notes"     TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomPlanAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomPlanAssignment_userId_key" ON "CustomPlanAssignment"("userId");

-- CreateTable: BillingConfig
CREATE TABLE "BillingConfig" (
    "id"                   TEXT NOT NULL DEFAULT 'global',
    "trialDays"            INTEGER NOT NULL DEFAULT 7,
    "paygRateProUsd"       DOUBLE PRECISION NOT NULL DEFAULT 0.001,
    "paygRateFreeUsd"      DOUBLE PRECISION NOT NULL DEFAULT 0.002,
    "managedMarkupPercent" INTEGER NOT NULL DEFAULT 20,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKeys
ALTER TABLE "BillingProduct" ADD CONSTRAINT "BillingProduct_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomPlanAssignment" ADD CONSTRAINT "CustomPlanAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomPlanAssignment" ADD CONSTRAINT "CustomPlanAssignment_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "BillingProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomPlanAssignment" ADD CONSTRAINT "CustomPlanAssignment_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
