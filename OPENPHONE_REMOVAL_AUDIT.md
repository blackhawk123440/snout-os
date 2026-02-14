# OpenPhone Removal Audit

**Purpose:** List all OpenPhone references that need to be removed or redirected.

## Files with OpenPhone References

### 1. `src/app/integrations/page.tsx`
- **Line 69-73:** `openphoneStatus` object (redirects to Messages → Twilio Setup) ✅ Already redirected
- **Line 119-133:** "Messaging Provider (Twilio)" integration card (mentions OpenPhone in variable name but content is Twilio) ✅ Already updated

### 2. `src/app/settings/page.tsx`
- **Line 254-269:** Messaging Provider section (redirects to Messages → Twilio Setup) ✅ Already redirected

### 3. `src/app/api/sitters/route.ts` and `src/app/api/sitters/[id]/route.ts`
- **Status:** May contain legacy `openphonePhone` field references
- **Action:** Verify these are handled correctly (schema mismatch already addressed)

### 4. `src/lib/openphone.ts` and `src/lib/openphone-verify.ts`
- **Status:** Legacy files that may still exist
- **Action:** These should be removed or marked as deprecated if not used

### 5. `src/lib/env.ts`, `src/lib/message-utils.ts`, `src/worker/automation-worker.ts`, `src/lib/masked-numbers.ts`, `src/lib/phone-utils.ts`
- **Status:** May contain OpenPhone utility functions
- **Action:** Verify these are not used, or replace with Twilio equivalents

### 6. `src/app/settings/page-legacy.tsx` and `src/app/bookings/page-legacy.tsx`
- **Status:** Legacy files (may be unused)
- **Action:** Verify if these are still referenced

### 7. `src/app/tip/link-builder/page.tsx`
- **Status:** Unknown reference
- **Action:** Check if this is still used

## Routes to Remove/Redirect

### `/integrations`
- **Status:** ✅ Already redirects messaging setup to `/messages?tab=setup`
- **Action:** No change needed

### `/settings` (Messaging Provider section)
- **Status:** ✅ Already redirects to `/messages?tab=setup`
- **Action:** No change needed

## Verification Checklist

- [ ] All user-facing OpenPhone references removed
- [ ] All OpenPhone API endpoints removed or return 404
- [ ] Settings/Integrations pages redirect to Messages → Twilio Setup
- [ ] No broken OpenPhone test buttons
- [ ] Legacy OpenPhone files removed or deprecated
- [ ] Navigation shows Messaging only once (no duplicates)

## Next Steps

1. Remove or deprecate `src/lib/openphone.ts` and `src/lib/openphone-verify.ts` if unused
2. Verify legacy files (`page-legacy.tsx`) are not referenced
3. Check `src/app/tip/link-builder/page.tsx` for OpenPhone usage
4. Ensure all OpenPhone env vars are removed from documentation
