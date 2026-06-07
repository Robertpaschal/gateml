-- Add useManaged flag to User (opt-in to GateML managed provider keys)
ALTER TABLE "User"
  ADD COLUMN "useManaged" BOOLEAN NOT NULL DEFAULT false;

-- Add token tracking to UsageRecord (for managed-mode billing)
ALTER TABLE "UsageRecord"
  ADD COLUMN "tokensUsed"     INTEGER          NOT NULL DEFAULT 0,
  ADD COLUMN "managedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0;
