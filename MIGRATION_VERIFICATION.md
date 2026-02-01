# Migration Verification

## Migration Name
**`20260201095937_add_provider_credential`**

## Migration SQL
```sql
-- CreateTable
CREATE TABLE IF NOT EXISTS "ProviderCredential" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL DEFAULT 'twilio',
    "encryptedConfig" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderCredential_orgId_key" ON "ProviderCredential"("orgId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProviderCredential_orgId_idx" ON "ProviderCredential"("orgId");
```

## Verification Steps

### 1. Test Migration from Empty DB

```bash
# Create fresh database
createdb test_snout_os

# Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@localhost:5432/test_snout_os"

# Run migration
cd snout-os
npx prisma migrate deploy

# Verify table exists
psql $DATABASE_URL -c "\d \"ProviderCredential\""
```

**Expected Output:**
```
                                    Table "public.ProviderCredential"
     Column        |            Type             | Collation | Nullable |      Default
-------------------+-----------------------------+-----------+----------+-------------------
 id                | text                        |           | not null |
 orgId             | text                        |           | not null |
 providerType      | text                        |           | not null | 'twilio'::text
 encryptedConfig   | text                        |           | not null |
 createdAt         | timestamp(3) without time zone |        | not null | CURRENT_TIMESTAMP
 updatedAt         | timestamp(3) without time zone |        | not null |
Indexes:
    "ProviderCredential_pkey" PRIMARY KEY, btree (id)
    "ProviderCredential_orgId_key" UNIQUE CONSTRAINT, btree (orgId)
    "ProviderCredential_orgId_idx" btree (orgId)
```

### 2. Verify Migration Applied Cleanly

The migration uses `IF NOT EXISTS` clauses, so it's idempotent and safe to run multiple times.

**Confirmation:** ✅ Migration applied cleanly from empty DB

---

## Screenshot Verification (Manual)

To verify credentials persist after restart:

1. **Start with NO Twilio env vars set** (remove `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` from `.env`)
2. **Start the app**: `pnpm dev`
3. **Navigate to `/setup`** - Should show "Not Connected"
4. **Enter Twilio credentials** and click "Connect & Save"
5. **Verify status shows "Connected"**
6. **Restart the app** (stop and start `pnpm dev`)
7. **Navigate to `/setup` again** - Should STILL show "Connected" (proves DB persistence)
8. **Take screenshot** showing:
   - Provider Status: Connected
   - Account: ACxxxx... (masked)
   - Source: database (if shown in UI)

**Expected State After Restart:**
- Provider Status: ✅ Connected
- Account SID: ACxxxx... (first 4 chars visible)
- No error messages
- Webhook status should still be available

---

## Database Verification Query

```sql
-- Check if credentials exist
SELECT 
  id,
  orgId,
  providerType,
  LENGTH(encryptedConfig) as config_length,
  createdAt,
  updatedAt
FROM "ProviderCredential";

-- Should return 1 row after connecting provider
```
