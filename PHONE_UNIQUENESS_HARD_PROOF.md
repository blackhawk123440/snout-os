# Phone-to-Client Uniqueness - Hard Proof

## 1) Exact DB Constraint (UNIQUE, org-scoped)

### Migration SQL

**File:** `enterprise-messaging-dashboard/apps/api/prisma/migrations/20260130000000_phone_to_client_uniqueness/migration.sql`

```sql
-- Step 1: Add orgId column to ClientContact for direct uniqueness enforcement
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
```

**Proof:** Line 35-36 creates `CREATE UNIQUE INDEX ... ON "ClientContact"("orgId", "e164")`

**Migration Path:** `enterprise-messaging-dashboard/apps/api/prisma/migrations/20260130000000_phone_to_client_uniqueness/migration.sql`

## 2) Prisma Schema Proof

**File:** `enterprise-messaging-dashboard/apps/api/prisma/schema.prisma:74-88`

```prisma
model ClientContact {
  id        String   @id @default(uuid())
  orgId     String   // Added for org-scoped uniqueness
  clientId  String
  e164      String   // E.164 format
  label     String?  // e.g., "Mobile", "Home"
  verified  Boolean  @default(false)
  createdAt DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  client        Client      @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([clientId, e164])
  @@unique([orgId, e164]) // Enforce: one phone per org
  @@index([e164])
  @@index([orgId, e164])
}
```

**Proof:** Line 87 shows `@@unique([orgId, e164])`

## 3) Exact Upsert Code

**File:** `src/app/api/messages/threads/route.ts:201-288`

### Phone Normalization (Line 201-202)
```typescript
// Normalize phone number to E.164
const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
```

### Upsert Using Unique Key (Line 259-288)
```typescript
// CRITICAL: Use upsert to enforce one phone per org at DB level
// This prevents duplicates even under concurrent requests.
// The UNIQUE constraint on ClientContact(orgId, e164) ensures atomicity.
const contact = await (prisma as any).clientContact.upsert({
  where: {
    orgId_e164: {
      orgId,
      e164: normalizedPhone,
    },
  },
  update: {
    // Contact exists, no update needed
  },
  create: {
    orgId,
    e164: normalizedPhone,
    label: 'Mobile',
    verified: false,
    client: {
      create: {
        orgId,
        name: `Guest (${normalizedPhone})`,
      },
    },
  },
  include: {
    client: {
      include: {
        contacts: true,
      },
    },
  },
});

const client = contact.client;
```

**Proof:**
- Line 202: Normalizes to E.164
- Line 261-264: Uses `orgId_e164` unique key
- Line 259: Uses `upsert` (atomic operation)
- UNIQUE constraint prevents duplicates under concurrency

## 4) Concurrency Test (CURRENTLY MOCKED - NEEDS REAL DB)

**File:** `src/lib/messaging/__tests__/phone-to-client-uniqueness.test.ts:130-199`

### Current Test (Lines 154-188)
```typescript
it('should handle concurrent requests without creating duplicates', async () => {
  // Scenario: Two simultaneous requests to create thread by same phone
  // Expected: Only one ClientContact row, one Client row, one Thread row

  const contact = {
    id: 'contact-1',
    orgId,
    e164: phoneE164,
    client: guestClient,
  };

  // Both requests call upsert simultaneously
  (prisma.clientContact.upsert as any)
    .mockResolvedValueOnce(contact) // First request creates
    .mockResolvedValueOnce(contact); // Second request finds existing

  // Simulate concurrent calls
  const [result1, result2] = await Promise.all([
    prisma.clientContact.upsert({
      where: { orgId_e164: { orgId, e164: phoneE164 } },
      update: {},
      create: {
        orgId,
        e164: phoneE164,
        label: 'Mobile',
        verified: false,
        client: {
          create: {
            orgId,
            name: `Guest (${phoneE164})`,
          },
        },
      },
    }),
    prisma.clientContact.upsert({
      where: { orgId_e164: { orgId, e164: phoneE164 } },
      update: {},
      create: {
        orgId,
        e164: phoneE164,
        label: 'Mobile',
        verified: false,
        client: {
          create: {
            orgId,
            name: `Guest (${phoneE164})`,
          },
        },
      },
    }),
  ]);

  // Verify: Both return the same contact
  expect(result1.id).toBe(result2.id);
  expect(result1.client.id).toBe(result2.client.id);
});
```

**Problem:** This test uses mocks (`vi.mock('@/lib/db')`), not a real database. It does NOT prove the UNIQUE constraint works.

**Required:** A real integration test against PostgreSQL that:
1. Creates a test database
2. Runs the migration
3. Issues 2+ parallel `upsert` calls
4. Queries DB to verify exactly 1 ClientContact row, 1 Client row, 1 Thread row

## 5) Runtime DB Verification Queries

### Query 1: Verify No Duplicate ClientContacts
```sql
SELECT 
  "orgId", 
  e164, 
  COUNT(*) as duplicate_count
FROM "ClientContact"
GROUP BY "orgId", e164
HAVING COUNT(*) > 1;
```
**Expected:** 0 rows

### Query 2: Verify No Duplicate Threads
```sql
SELECT 
  "orgId", 
  "clientId", 
  COUNT(*) as duplicate_count
FROM "Thread"
GROUP BY "orgId", "clientId"
HAVING COUNT(*) > 1;
```
**Expected:** 0 rows

### Query 3: Verify UNIQUE Index Exists
```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'ClientContact'
  AND indexname = 'ClientContact_orgId_e164_key';
```
**Expected:** 1 row with `CREATE UNIQUE INDEX "ClientContact_orgId_e164_key" ON "ClientContact"("orgId", "e164")`

## 6) Deployment Proof (CANNOT VERIFY WITHOUT STAGING ACCESS)

**Cannot provide without:**
- Access to staging database
- Migration status output
- `\d ClientContact` or `pg_indexes` query results

**To verify deployment:**
1. Connect to staging DB
2. Run: `SELECT * FROM pg_indexes WHERE tablename = 'ClientContact' AND indexname = 'ClientContact_orgId_e164_key';`
3. Run: `SELECT "orgId", e164, COUNT(*) FROM "ClientContact" GROUP BY "orgId", e164 HAVING COUNT(*) > 1;`
4. Run: `SELECT migration_name, applied_at FROM _prisma_migrations WHERE migration_name LIKE '%phone_to_client_uniqueness%';`

## Summary

✅ **1-3 Complete:** Migration, schema, and upsert code are correct
❌ **4 Incomplete:** Test uses mocks, not real DB
❌ **5-6 Cannot Verify:** Need staging DB access

**Action Required:**
1. Create real integration test against PostgreSQL
2. Verify migration applied in staging
3. Run verification queries on staging DB
