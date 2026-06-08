-- AddField: AdminUser.tokenVersion
ALTER TABLE "AdminUser" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum: CampaignStatus
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum: CampaignTarget
CREATE TYPE "CampaignTarget" AS ENUM ('ALL', 'FREE', 'PRO', 'ENTERPRISE');

-- CreateTable: AdminNote
CREATE TABLE "AdminNote" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "adminId"   TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminNote_userId_createdAt_idx" ON "AdminNote"("userId", "createdAt" DESC);

-- AddForeignKey: AdminNote -> User
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: AdminNote -> AdminUser
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: Campaign
CREATE TABLE "Campaign" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "subject"     TEXT NOT NULL,
    "body"        TEXT NOT NULL,
    "htmlBody"    TEXT,
    "target"      "CampaignTarget" NOT NULL DEFAULT 'ALL',
    "status"      "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt"      TIMESTAMP(3),
    "sentCount"   INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Campaign_status_scheduledAt_idx" ON "Campaign"("status", "scheduledAt");

-- AddForeignKey: Campaign -> AdminUser
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: PromoCode
CREATE TABLE "PromoCode" (
    "id"              TEXT NOT NULL,
    "code"            TEXT NOT NULL,
    "description"     TEXT,
    "discountPercent" INTEGER NOT NULL,
    "stripeCouponId"  TEXT,
    "maxUses"         INTEGER,
    "usedCount"       INTEGER NOT NULL DEFAULT 0,
    "validFrom"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil"      TIMESTAMP(3),
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "createdBy"       TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_code_isActive_idx" ON "PromoCode"("code", "isActive");

-- AddForeignKey: PromoCode -> AdminUser
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
