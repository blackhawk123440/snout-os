# Phase 3.1 Hardening Patch - Acceptance Criteria

**Phase**: 3.1 Patch  
**Date**: 2025-01-04  
**Status**: Implementation Complete

---

## Phase 3.1: Hardening Patch

### Authorization Negative Tests ✅

#### Test 1: Sitter Role Authorization
- **File**: `src/app/api/messages/__tests__/phase-3-integration.test.ts`
- **Test**: `should return 403 and make no changes when sitter tries to force send`
- **Verification**:
  - ✅ Sitter role receives 403
  - ✅ No MessageEvent updates
  - ✅ No AntiPoachingAttempt updates

#### Test 2: Org Isolation
- **File**: `src/app/api/messages/__tests__/phase-3-integration.test.ts`
- **Test**: `should enforce org isolation on force send endpoint`
- **Verification**:
  - ✅ Event from different org returns 403
  - ✅ Error message mentions "different organization"
  - ✅ No updates made

### Test Command
```bash
npm test -- src/app/api/messages/__tests__/phase-3-integration.test.ts
```

### Pass Criteria
- ✅ Both authorization tests pass
- ✅ No false positives
- ✅ Org isolation properly enforced

---

## Backlog Ticket: MessageEvent Schema Enhancement

### Ticket: Add `wasBlocked` and `antiPoachingFlagged` Fields to MessageEvent

**Priority**: Medium (currently stored in `metadataJson`, migration optional)

**Description**:
Add explicit boolean fields to `MessageEvent` model for anti-poaching blocking status instead of storing in `metadataJson`. This will improve query performance and reporting.

**Schema Changes**:
```prisma
model MessageEvent {
  // ... existing fields ...
  
  // NEW FIELDS:
  wasBlocked          Boolean  @default(false) // If message was blocked
  antiPoachingFlagged Boolean  @default(false) // If message flagged for anti-poaching
  
  @@index([wasBlocked])
  @@index([antiPoachingFlagged])
  @@index([wasBlocked, antiPoachingFlagged]) // Composite index for reporting queries
}
```

**Migration Plan**:

1. **Add fields with defaults**:
   ```sql
   ALTER TABLE "MessageEvent" 
   ADD COLUMN "wasBlocked" BOOLEAN NOT NULL DEFAULT false,
   ADD COLUMN "antiPoachingFlagged" BOOLEAN NOT NULL DEFAULT false;
   ```

2. **Backfill from metadataJson**:
   ```sql
   UPDATE "MessageEvent"
   SET 
     "wasBlocked" = COALESCE((metadata_json->>'wasBlocked')::boolean, false),
     "antiPoachingFlagged" = COALESCE((metadata_json->>'antiPoachingFlagged')::boolean, false)
   WHERE metadata_json IS NOT NULL;
   ```

3. **Create indexes**:
   ```sql
   CREATE INDEX "MessageEvent_wasBlocked_idx" ON "MessageEvent"("wasBlocked");
   CREATE INDEX "MessageEvent_antiPoachingFlagged_idx" ON "MessageEvent"("antiPoachingFlagged");
   CREATE INDEX "MessageEvent_wasBlocked_antiPoachingFlagged_idx" ON "MessageEvent"("wasBlocked", "antiPoachingFlagged");
   ```

**Indexing Guidance for Reporting**:
- **Single field queries**: Use individual indexes (`wasBlocked`, `antiPoachingFlagged`)
- **Combined queries**: Use composite index (`wasBlocked`, `antiPoachingFlagged`)
- **Common reporting queries**:
  - `WHERE wasBlocked = true` → Uses `wasBlocked` index
  - `WHERE antiPoachingFlagged = true` → Uses `antiPoachingFlagged` index
  - `WHERE wasBlocked = true AND antiPoachingFlagged = true` → Uses composite index
  - `WHERE wasBlocked = true OR antiPoachingFlagged = true` → Uses individual indexes with OR optimization

**Backward Compatibility**:
- Continue reading from `metadataJson` if new fields are null (for existing records)
- Write to both `metadataJson` and new fields (dual-write during transition)
- Eventually remove `metadataJson` fields in future migration

**Rollback Plan**:
- Fields can be dropped safely if needed
- `metadataJson` still contains the data

**Status**: Documented, awaiting approval for implementation
