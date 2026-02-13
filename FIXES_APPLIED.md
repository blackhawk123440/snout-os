# Fixes Applied - Production Readiness

## Phase 1: Missing BFF Proxy Routes ✅

### Created Routes:
1. ✅ `GET /api/messages/threads/[id]/messages` → `src/app/api/messages/threads/[id]/messages/route.ts`
2. ✅ `POST /api/messages/threads/[id]/messages` → Added to same file
3. ✅ `POST /api/messages/[id]/retry` → `src/app/api/messages/[id]/retry/route.ts`
4. ✅ `GET /api/sitter/threads` → `src/app/api/sitter/threads/route.ts`
5. ✅ `GET /api/sitter/threads/[id]/messages` → `src/app/api/sitter/threads/[id]/messages/route.ts`
6. ✅ `POST /api/sitter/threads/[id]/messages` → Added to same file
7. ⚠️ `GET /api/routing/threads/[id]/history` → NEEDS TO BE CREATED (API endpoint may not exist)

## Phase 2: Role Separation Enforcement ✅

### Middleware Updates:
- ✅ Updated `src/middleware.ts` to default auth protection to `true` (unless explicitly disabled)
- ✅ Sitter routes are protected: `/sitter/*` only accessible to sitters
- ✅ Owner routes are protected: `/messages`, `/numbers`, `/assignments` redirect sitters
- ⚠️ **TODO**: Verify middleware is actually enforcing (may need to check session in middleware)

### Logout Button:
- ✅ Already exists in `AppShell.tsx` (line 467)
- ✅ Calls `signOut()` and redirects to `/login`

## Phase 3: Quarantine Fixes ✅

### API Service Updates:
- ✅ `quarantineNumber()` now accepts:
  - `durationDays?: number` (1, 7, 30, 90, or custom)
  - `customReleaseDate?: Date` (for specific date)
  - Defaults to 90 days if not specified

- ✅ `releaseFromQuarantine()` now accepts:
  - `forceRestore?: boolean` (override cooldown)
  - `restoreReason?: string` (audit reason for override)
  - Creates audit event with override details

### Controller Updates:
- ✅ `POST /api/numbers/:id/quarantine` accepts `durationDays` and `customReleaseDate`
- ✅ `POST /api/numbers/:id/release-from-quarantine` accepts `forceRestore` and `restoreReason`

### Frontend Updates Needed:
- ⚠️ **TODO**: Update `src/app/numbers/page.tsx` to:
  - Show duration selector in quarantine modal (1 day, 7 days, 30 days, 90 days, custom date)
  - Add "Restore Now" button with confirmation modal for quarantined numbers
  - Show restore reason input when using "Restore Now"

## Phase 4: Seed Script for Proof Scenarios ⚠️

### Required Scenarios:
1. ⚠️ **TODO**: 1 unread thread
2. ⚠️ **TODO**: 1 failed delivery message (with Retry button visible)
3. ⚠️ **TODO**: 1 policy violation message (with banner visible)
4. ⚠️ **TODO**: 1 active assignment window (window badge visible)

### Location:
- Create: `snout-os/scripts/seed-proof-scenarios.ts`
- Or add to existing seed script

## Phase 5: Runtime Proof Document ⚠️

### Required Content:
- ⚠️ **TODO**: Create `snout-os/RUNTIME_PROOF.md` with:
  - Exact click-path for owner login → messages → features
  - Exact click-path for sitter login → inbox
  - Network requests expected (URLs, status codes, response shapes)
  - Screenshot checklist
  - Playwright test commands

## Next Steps

1. **Update Frontend Quarantine UI** - Add duration selector and restore-now
2. **Create Seed Script** - For proof scenarios
3. **Create Runtime Proof Document** - With exact steps
4. **Test All Routes** - Verify BFF proxies work
5. **Verify Middleware** - Ensure role separation is enforced

## Files Modified

### Created:
- `src/app/api/messages/threads/[id]/messages/route.ts`
- `src/app/api/messages/[id]/retry/route.ts`
- `src/app/api/sitter/threads/route.ts`
- `src/app/api/sitter/threads/[id]/messages/route.ts`
- `REALITY_AUDIT.md`
- `FIXES_APPLIED.md`

### Modified:
- `src/middleware.ts` - Default auth protection to true
- `enterprise-messaging-dashboard/apps/api/src/numbers/numbers.service.ts` - Quarantine duration + restore-now
- `enterprise-messaging-dashboard/apps/api/src/numbers/numbers.controller.ts` - Accept new parameters

### Still Needed:
- Frontend quarantine UI updates
- Seed script for proof scenarios
- Runtime proof document
- Routing history endpoint (if needed)
