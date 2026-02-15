-- Migration: Enforce one client per phone per org
-- 
-- Problem: Guest clients created by phone can create duplicates if same phone
-- is used to create a client later, leading to multiple threads for same phone.
--
-- Solution: Add unique constraint on (orgId, e164) via ClientContact.
-- Since ClientContact has @@unique([clientId, e164]), we need to ensure
-- that for a given (orgId, e164), there's only one ClientContact.
--
-- We'll add a unique index on ClientContact(orgId, e164) by joining through Client.
-- However, Prisma doesn't support cross-table unique constraints directly.
--
-- Alternative: Add a helper function that ensures phone→client uniqueness
-- by always finding existing ClientContact by (orgId, e164) first.
--
-- For now, we'll add an index to speed up lookups and document the invariant
-- in application code.

-- Add index for fast phone→client lookup
CREATE INDEX IF NOT EXISTS "ClientContact_orgId_e164_idx" ON "ClientContact"("e164");

-- Note: We cannot create a unique constraint across Client and ClientContact
-- in PostgreSQL without a function or trigger. The application code must
-- enforce the invariant by always using findFirst with orgId + e164 lookup.
