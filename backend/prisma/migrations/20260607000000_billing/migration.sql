-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "plan"             "Plan"   NOT NULL DEFAULT 'FREE',
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "payAsYouGo"       BOOLEAN  NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateTable
CREATE TABLE "Subscription" (
  "id"                 TEXT         NOT NULL,
  "userId"             TEXT         NOT NULL,
  "stripeSubId"        TEXT         NOT NULL,
  "stripePriceId"      TEXT         NOT NULL,
  "status"             TEXT         NOT NULL,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd"   TIMESTAMP(3) NOT NULL,
  "cancelAtPeriodEnd"  BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_userId_key"    ON "Subscription"("userId");
CREATE UNIQUE INDEX "Subscription_stripeSubId_key" ON "Subscription"("stripeSubId");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UsageRecord" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "month"     TEXT         NOT NULL,
  "requests"  INTEGER      NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsageRecord_userId_month_key" ON "UsageRecord"("userId", "month");
CREATE INDEX "UsageRecord_userId_idx" ON "UsageRecord"("userId");

ALTER TABLE "UsageRecord"
  ADD CONSTRAINT "UsageRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
