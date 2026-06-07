-- Migration: in_house_auth_audit_invite
-- Adds in-house email/password auth to User,
-- invite-based admin creation, domain allowlist, and audit log.

-- ── User: in-house auth fields ────────────────────────────────────────────────
ALTER TABLE "User" ALTER COLUMN "firebaseUid" DROP NOT NULL;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordHash"             TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerified"            BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "emailVerificationToken"   TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerificationExpiry"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "passwordResetToken"       TEXT,
  ADD COLUMN IF NOT EXISTS "passwordResetExpiry"      TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerificationToken_key"
  ON "User"("emailVerificationToken");

CREATE UNIQUE INDEX IF NOT EXISTS "User_passwordResetToken_key"
  ON "User"("passwordResetToken");

-- ── AdminUser: invite flow ────────────────────────────────────────────────────
ALTER TABLE "AdminUser" ALTER COLUMN "passwordHash" DROP NOT NULL;

ALTER TABLE "AdminUser"
  ADD COLUMN IF NOT EXISTS "isActive"      BOOLEAN   NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "inviteToken"   TEXT,
  ADD COLUMN IF NOT EXISTS "inviteExpiry"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "invitedBy"     TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_inviteToken_key"
  ON "AdminUser"("inviteToken");

ALTER TABLE "AdminUser"
  ADD CONSTRAINT "AdminUser_invitedBy_fkey"
  FOREIGN KEY ("invitedBy") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- ── AdminDomain ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AdminDomain" (
  "id"        TEXT NOT NULL,
  "domain"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminDomain_domain_key" ON "AdminDomain"("domain");

-- ── AuditLog ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         TEXT NOT NULL,
  "adminId"    TEXT,
  "userId"     TEXT,
  "action"     TEXT NOT NULL,
  "resource"   TEXT NOT NULL,
  "resourceId" TEXT,
  "metadata"   JSONB,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "AuditLog_resource_resourceId_idx"  ON "AuditLog"("resource", "resourceId");
CREATE INDEX IF NOT EXISTS "AuditLog_adminId_createdAt_idx"    ON "AuditLog"("adminId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx"     ON "AuditLog"("userId",  "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx"            ON "AuditLog"("createdAt" DESC);
