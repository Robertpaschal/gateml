-- Add ADMIN tier to AdminRole enum
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- Add marketing unsubscribe flag to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unsubscribedFromMarketing" BOOLEAN NOT NULL DEFAULT false;
