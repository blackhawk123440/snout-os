-- Add ProviderCredential table for Twilio (and future provider) credentials.
-- Used by Next.js setup: connect saves here; provider/status and webhooks read from here.

CREATE TABLE IF NOT EXISTS "ProviderCredential" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL DEFAULT 'twilio',
    "encryptedConfig" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderCredential_orgId_key" ON "ProviderCredential"("orgId");
CREATE INDEX IF NOT EXISTS "ProviderCredential_orgId_idx" ON "ProviderCredential"("orgId");
