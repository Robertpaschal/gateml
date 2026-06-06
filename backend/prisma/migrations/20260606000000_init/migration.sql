-- CreateEnum
CREATE TYPE "KeyType" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE');

-- CreateTable
CREATE TABLE "User" (
    "id"          TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email"       TEXT NOT NULL,
    "fcmToken"    TEXT,
    "name"        TEXT,
    "avatarUrl"   TEXT,
    "provider"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "key"        TEXT NOT NULL,
    "keyPrefix"  TEXT NOT NULL,
    "type"       "KeyType" NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt"  TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderKey" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "provider"     "LLMProvider" NOT NULL,
    "keyEncrypted" TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingConfig" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "primaryModel"  TEXT NOT NULL DEFAULT 'gpt-4o',
    "fallbackChain" JSONB NOT NULL DEFAULT '[]',
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id"               TEXT NOT NULL,
    "apiKeyId"         TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "model"            TEXT NOT NULL,
    "provider"         TEXT NOT NULL,
    "status"           INTEGER NOT NULL,
    "latencyMs"        INTEGER NOT NULL,
    "promptTokens"     INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "path"             TEXT NOT NULL,
    "isTestMode"       BOOLEAN NOT NULL DEFAULT false,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "model"     TEXT NOT NULL DEFAULT 'gpt-4o',
    "status"    TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id"        TEXT NOT NULL,
    "promptId"  TEXT NOT NULL,
    "version"   INTEGER NOT NULL,
    "body"      TEXT NOT NULL,
    "note"      TEXT NOT NULL DEFAULT '',
    "isActive"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
CREATE UNIQUE INDEX "User_email_key"       ON "User"("email");
CREATE UNIQUE INDEX "ApiKey_key_key"       ON "ApiKey"("key");
CREATE INDEX "ApiKey_userId_idx"           ON "ApiKey"("userId");
CREATE INDEX "ApiKey_key_idx"              ON "ApiKey"("key");
CREATE UNIQUE INDEX "ProviderKey_userId_provider_key" ON "ProviderKey"("userId", "provider");
CREATE UNIQUE INDEX "RoutingConfig_userId_key"        ON "RoutingConfig"("userId");
CREATE INDEX "RequestLog_userId_createdAt_idx"        ON "RequestLog"("userId", "createdAt" DESC);
CREATE INDEX "RequestLog_apiKeyId_idx"                ON "RequestLog"("apiKeyId");
CREATE INDEX "Prompt_userId_idx"                      ON "Prompt"("userId");
CREATE UNIQUE INDEX "PromptVersion_promptId_version_key" ON "PromptVersion"("promptId", "version");
CREATE INDEX "PromptVersion_promptId_idx"             ON "PromptVersion"("promptId");

-- AddForeignKey
ALTER TABLE "ApiKey"        ADD CONSTRAINT "ApiKey_userId_fkey"        FOREIGN KEY ("userId")    REFERENCES "User"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderKey"   ADD CONSTRAINT "ProviderKey_userId_fkey"   FOREIGN KEY ("userId")    REFERENCES "User"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoutingConfig" ADD CONSTRAINT "RoutingConfig_userId_fkey" FOREIGN KEY ("userId")    REFERENCES "User"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestLog"    ADD CONSTRAINT "RequestLog_apiKeyId_fkey"  FOREIGN KEY ("apiKeyId")  REFERENCES "ApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestLog"    ADD CONSTRAINT "RequestLog_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")   ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prompt"        ADD CONSTRAINT "Prompt_userId_fkey"        FOREIGN KEY ("userId")    REFERENCES "User"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
