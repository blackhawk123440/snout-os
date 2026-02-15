-- Migration: Enforce one client per phone per org
-- 
-- Problem: Guest clients created by phone can create duplicates if same phone
-- is used to create a client later, leading to multiple threads for same phone.
--
-- Solution: Add UNIQUE constraint on ClientContact(orgId, e164).
-- This ensures at the database level that one phone number maps to one client per org.
--
-- Implementation: We need to add orgId to ClientContact or create a unique index
-- that includes orgId. Since ClientContact doesn't have orgId directly, we'll
-- create a unique index that joins through Client.

-- Step 1: Add orgId column to ClientContact for direct uniqueness enforcement
-- (Alternative: Use a unique index with JOIN, but direct column is cleaner)
ALTER TABLE "ClientContact" 
ADD COLUMN IF NOT EXISTS "orgId" TEXT;

-- Step 2: Backfill orgId from Client
UPDATE "ClientContact" cc
SET "orgId" = c."orgId"
FROM "Client" c
WHERE cc."clientId" = c.id
  AND cc."orgId" IS NULL;

-- Step 3: Make orgId NOT NULL after backfill
ALTER TABLE "ClientContact"
ALTER COLUMN "orgId" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE "ClientContact"
ADD CONSTRAINT "ClientContact_orgId_fkey" 
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Create UNIQUE constraint on (orgId, e164)
CREATE UNIQUE INDEX IF NOT EXISTS "ClientContact_orgId_e164_key" 
ON "ClientContact"("orgId", "e164");

-- Step 6: Add index for fast lookups
CREATE INDEX IF NOT EXISTS "ClientContact_orgId_e164_idx" 
ON "ClientContact"("orgId", "e164");
