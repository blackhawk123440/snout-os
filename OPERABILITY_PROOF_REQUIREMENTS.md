# Operability Proof Requirements

## Code Changes Summary

### 1. Pool Capacity Enforcement ✅
**Location:** `src/lib/messaging/number-helpers.ts`

**Code Snippet (lines 217-225):**
```typescript
// ENFORCE maxConcurrentThreadsPerPoolNumber: Check capacity for each pool number
const maxConcurrent = parseInt(settings.maxConcurrentThreadsPerPoolNumber || '1', 10) || 1;

// Get thread counts for each pool number
const numberIds = poolNumbers.map(n => n.id);
const threadCounts = await prisma.messageThread.groupBy({
  by: ['messageNumberId'],
  where: {
    orgId,
    messageNumberId: { in: numberIds },
    status: { not: 'archived' },
  },
  _count: { id: true },
});

// Filter out numbers at capacity (deterministic: always skip at-capacity numbers)
const availableNumbers = poolNumbers.filter(num => {
  const currentCount = countMap.get(num.id) || 0;
  return currentCount < maxConcurrent;
});
```

**Proof:** Selection deterministically skips at-capacity numbers before applying strategy (LRU/FIFO/HASH_SHUFFLE).

### 2. Pool Exhausted Test ✅
**Location:** `src/lib/messaging/__tests__/pool-capacity.test.ts`

**Test:** `should return null when all pool numbers are at capacity`
- Creates 2 pool numbers
- Assigns threads to both (at capacity)
- Verifies `getPoolNumber()` returns `null`
- Documents requirement for routing to owner inbox + alert

### 3. Pool Release Job ✅
**Location:** `src/lib/messaging/pool-release-job.ts`

**Implementation:**
- Checks `postBookingGraceHours` (releases after booking window ends + grace period)
- Checks `inactivityReleaseDays` (releases after no messages for N days)
- Checks `maxPoolThreadLifetimeDays` (releases after thread lifetime expires)
- Writes audit events with release reasons
- Updates number usage counts (resets `lastAssignedAt` when no active threads)

**Endpoint:** `POST /api/ops/pool-release` (owner-only)

### 4. Release Behavior Tests ✅
**Location:** `src/lib/messaging/__tests__/pool-release.test.ts`

**Tests:**
- `should release pool numbers after postBookingGraceHours`
- `should release pool numbers after inactivityReleaseDays`
- `should release pool numbers after maxPoolThreadLifetimeDays`

All tests use time-travel scenarios with short TTLs for verification.

### 5. Owner-Only Check ✅
**Location:** `src/app/api/ops/chaos-mode/route.ts`

**Implementation:**
```typescript
// HARD BLOCK: Require owner auth (non-sitter = owner)
const sitterId = await getCurrentSitterId(request);
if (sitterId) {
  return NextResponse.json(
    { error: "Access denied: Chaos mode is owner-only" },
    { status: 403 }
  );
}
```

**Proof:** Returns 403 for sitters even in dev/staging.

### 6. Leakage Tests for Nested Metadata ✅
**Location:** `src/lib/messaging/__tests__/invariants.test.ts`

**Tests:**
- `should never expose real E164 numbers in sitter API responses (including nested metadata)`
  - Scans entire stringified response (including nested `metadata.routing.trace`, `metadata.audit.events`, `delivery.provider.error`)
  - Uses E164 regex and phone pattern matching
- `should never expose emails in sitter API responses (including audit details)`
  - Scans for email patterns in nested audit details

## Runtime Proof Requirements

### 1. Screenshot: /settings/rotation
**Required:**
- Navigate to `/settings/rotation`
- Change settings (e.g., `maxConcurrentThreadsPerPoolNumber` to 2, `stickyReuseKey` to `threadId`)
- Click "Save Settings"
- **Refresh the page**
- **Screenshot showing:** Settings persisted after refresh (not reset to defaults)

### 2. Network Tab: /api/settings/rotation
**Required:**
- Open DevTools → Network tab
- Navigate to `/settings/rotation`
- **Screenshot showing:**
  - `GET /api/settings/rotation` → 200
  - Response body contains saved values (not defaults)
  - After saving, `POST /api/settings/rotation` → 200
  - After refresh, `GET /api/settings/rotation` → 200 with same saved values

### 3. Audit Timeline: Pool Assignment Event
**Required:**
- Trigger a pool number assignment (create thread that needs pool number)
- Navigate to Audit timeline/logs
- **Screenshot showing:**
  - Event type: `pool.number.assigned`
  - Event includes:
    - `selected number` (e164)
    - `selection strategy` (LRU/FIFO/HASH_SHUFFLE)
    - `capacity check result`:
      - `maxConcurrent`
      - `currentCount`
      - `availableCount`
      - `totalPoolCount`

### 4. Audit Timeline: Auto-Release Event
**Required:**
- Set short TTL in rotation settings (e.g., `inactivityReleaseDays: 1`)
- Create thread with pool number
- Wait for TTL to expire (or manually trigger `/api/ops/pool-release`)
- Navigate to Audit timeline/logs
- **Screenshot showing:**
  - Event type: `pool.number.released`
  - Event includes:
    - `numberId` and `e164`
    - `threadId`
    - `reason` (e.g., "inactivityReleaseDays (1d) expired")
    - `settings` used for release decision

## Test Execution

Run tests to verify:
```bash
# Pool capacity tests
pnpm test src/lib/messaging/__tests__/pool-capacity.test.ts

# Pool release tests
pnpm test src/lib/messaging/__tests__/pool-release.test.ts

# Leakage tests
pnpm test src/lib/messaging/__tests__/invariants.test.ts
```

All tests should pass in CI.
