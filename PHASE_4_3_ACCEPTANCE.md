# Phase 4.3: Operational Integration Upgrade - Acceptance Criteria

**Phase**: 4.3  
**Date**: 2025-01-04  
**Status**: Implementation Complete (Testing Required)

---

## Overview

Phase 4.3 implements proactive thread and window creation when bookings are assigned to sitters for weekly/recurring clients. This prevents first-message edge cases by ensuring threads and assignment windows exist before any messaging occurs.

---

## Implementation Summary

### Feature Flag
- ✅ `ENABLE_PROACTIVE_THREAD_CREATION` (default: false)
- ✅ Added to `src/lib/env.ts`
- ✅ Gates all proactive thread creation logic

### Core Functionality ✅

#### `ensureProactiveThreadCreation()`
**Location**: `src/lib/messaging/proactive-thread-creation.ts`

**Behavior**:
- ✅ Checks feature flag (returns null if disabled)
- ✅ Fetches booking with client information
- ✅ Determines client classification (recurring vs one-time)
- ✅ **Skips one-time clients** (only creates for recurring/weekly)
- ✅ Finds or creates MessageThread (idempotent)
- ✅ Determines and assigns MessageNumber (sitter masked for recurring with sitter)
- ✅ Creates or updates AssignmentWindow with buffers (idempotent)
- ✅ Updates thread with window ID

**Idempotency Guarantees**:
- ✅ Multiple calls with same booking/sitter don't create duplicate threads
- ✅ `findOrCreateAssignmentWindow` ensures no duplicate windows
- ✅ Thread lookup by `bookingId + clientId + orgId` prevents duplicates

#### `handleBookingReassignment()`
**Location**: `src/lib/messaging/proactive-thread-creation.ts`

**Behavior**:
- ✅ Updates existing thread with new sitter ID
- ✅ Updates assignment window with new sitter ID (via `findOrCreateAssignmentWindow`)
- ✅ Reassigns number if needed (sitter masked number for new sitter)
- ✅ Closes windows when sitter unassigned
- ✅ Gracefully handles missing thread (returns early)

### Integration ✅

#### Booking PATCH Endpoint
**Location**: `src/app/api/bookings/[id]/route.ts`

**Integration Points**:
- ✅ **New Assignment**: Calls `ensureProactiveThreadCreation()` when sitter assigned
- ✅ **Reassignment**: Calls `handleBookingReassignment()` when sitter changes
- ✅ **Unassignment**: Calls `handleBookingReassignment()` with null sitter
- ✅ Error handling: Logs errors but doesn't fail booking update
- ✅ Non-blocking: Thread creation failures don't prevent booking updates

**Flow**:
1. Booking updated with sitter assignment
2. Sitter assignment events emitted
3. Automation jobs enqueued
4. **Phase 4.3**: Proactive thread creation (if feature flag enabled)
5. Booking update completes

---

## Acceptance Criteria

### AC1: Feature Flag Control ✅
- [ ] When `ENABLE_PROACTIVE_THREAD_CREATION=false`, no threads are created
- [ ] When `ENABLE_PROACTIVE_THREAD_CREATION=true`, threads are created for recurring clients

### AC2: Thread Creation for Recurring Clients ✅
- [ ] Booking assignment creates MessageThread for recurring/weekly clients
- [ ] Thread is linked to booking (`bookingId` set)
- [ ] Thread is linked to client (`clientId` set)
- [ ] Thread is assigned to sitter (`assignedSitterId` set)
- [ ] Thread has correct classification (`isOneTimeClient=false` for recurring; recurring derived from explicit signal, not stored)
- [ ] Thread scope is `'client'` (not internal)

### AC3: Number Assignment ✅
- [ ] Sitter masked number assigned for recurring clients with sitter
- [ ] Number class derived correctly (`determineThreadNumberClass`)
- [ ] `MessageThread.numberClass` matches `MessageNumber.numberClass`

### AC4: Assignment Window Creation ✅
- [ ] Assignment window created with booking times + buffers
- [ ] Buffer calculation: 60 min pre/post for Drop-ins, 2 hours for Housesitting
- [ ] Window linked to thread (`threadId` set)
- [ ] Window linked to booking (`bookingId` set)
- [ ] Window assigned to sitter (`sitterId` set)
- [ ] Window status is `'active'`

### AC5: Idempotency ✅
- [ ] Multiple calls with same booking/sitter don't create duplicate threads
- [ ] Multiple calls don't create duplicate windows
- [ ] Thread lookup by `bookingId + clientId + orgId` works correctly
- [ ] `findOrCreateAssignmentWindow` prevents duplicate windows

### AC6: Reassignment Handling ✅
- [ ] Sitter change updates thread `assignedSitterId`
- [ ] Window `sitterId` updated (via `findOrCreateAssignmentWindow`)
- [ ] Number reassigned to new sitter's masked number
- [ ] No duplicate windows created on reassignment

### AC7: Unassignment Handling ✅
- [ ] Sitter unassignment updates thread (`assignedSitterId = null`)
- [ ] All booking windows closed (`closeAllBookingWindows`)
- [ ] Thread remains (not deleted)

### AC8: One-Time Client Skip ✅
- [ ] One-time clients do NOT get proactive threads
- [ ] Function returns `null` for one-time clients
- [ ] No threads, numbers, or windows created for one-time clients

### AC9: Owner UI Visibility ✅
- [ ] Threads appear in owner UI (`GET /api/messages/threads`)
- [ ] Threads show correct number class badge
- [ ] Threads show assigned sitter name
- [ ] Threads show active window status
- [ ] Thread detail view shows assignment history

### AC10: Error Handling ✅
- [ ] Thread creation failures logged but don't block booking update
- [ ] Missing booking fields handled gracefully
- [ ] Missing client handled gracefully (returns null)
- [ ] Provider errors don't crash booking endpoint

---

## Test Cases

### Test 1: Feature Flag Disabled
**Setup**: `ENABLE_PROACTIVE_THREAD_CREATION=false`  
**Action**: Assign sitter to booking for recurring client  
**Expected**: No thread created, booking update succeeds

### Test 2: Thread Creation for Recurring Client
**Setup**: `ENABLE_PROACTIVE_THREAD_CREATION=true`, recurring client  
**Action**: Assign sitter to booking  
**Expected**: 
- Thread created with correct fields
- Sitter masked number assigned
- Assignment window created with buffers

### Test 3: Skip One-Time Clients
**Setup**: `ENABLE_PROACTIVE_THREAD_CREATION=true`, one-time client  
**Action**: Assign sitter to booking  
**Expected**: No thread created, function returns null

### Test 4: Idempotency - Multiple Calls
**Setup**: Recurring client, thread already exists  
**Action**: Call `ensureProactiveThreadCreation` multiple times  
**Expected**: No duplicate threads or windows created

### Test 5: Sitter Reassignment
**Setup**: Booking with existing thread and window  
**Action**: Change sitter assignment  
**Expected**:
- Thread `assignedSitterId` updated
- Window `sitterId` updated (no duplicate)
- Number reassigned to new sitter

### Test 6: Sitter Unassignment
**Setup**: Booking with existing thread and window  
**Action**: Unassign sitter  
**Expected**:
- Thread `assignedSitterId` set to null
- All booking windows closed

### Test 7: Owner UI Visibility
**Setup**: Booking with proactive thread created  
**Action**: View messages page as owner  
**Expected**: Thread visible with correct metadata

---

## Test Commands

### Manual Testing
1. **Enable feature flag**: Set `ENABLE_PROACTIVE_THREAD_CREATION=true` in `.env.local`
2. **Start dev server**: `npm run dev`
3. **Create/update booking**: Assign sitter to booking for recurring client
4. **Verify thread**: Check `/messages` page - thread should appear
5. **Verify window**: Check thread detail - active window should show

### Integration Tests
```bash
npm test -- src/app/api/messages/__tests__/phase-4-3-integration.test.ts
```

**Expected**: All tests pass

### Proof Script
```bash
# Run proof script (when created)
npm run proof:phase4-3
```

**Expected**: All checks pass

---

## Files Modified

### New Files
- `src/lib/messaging/proactive-thread-creation.ts` - Core proactive creation logic
- `src/app/api/messages/__tests__/phase-4-3-integration.test.ts` - Integration tests

### Modified Files
- `src/lib/env.ts` - Added `ENABLE_PROACTIVE_THREAD_CREATION` feature flag
- `src/app/api/bookings/[id]/route.ts` - Integrated proactive creation on sitter assignment

---

## Acceptance Checklist

- [ ] Feature flag properly gates functionality
- [ ] Thread creation works for recurring clients
- [ ] One-time clients are skipped
- [ ] Number assignment works correctly
- [ ] Assignment windows created with buffers
- [ ] Idempotency verified (no duplicates)
- [ ] Reassignment updates thread and window
- [ ] Unassignment closes windows
- [ ] Threads visible in owner UI
- [ ] Error handling doesn't block booking updates
- [ ] Integration tests pass
- [ ] Manual testing successful

---

## Known Limitations

1. **Client Classification**: Relies on `determineClientClassification()` which may not detect all recurring clients until recurrence system is implemented. Currently defaults to one-time if no explicit signal.

2. **Number Provisioning**: Sitter masked numbers must be manually created in MessageNumber table. Auto-provisioning not yet implemented.

3. **Window Updates**: Window times don't automatically update if booking times change after thread creation. Manual update required (future enhancement).

---

## Next Steps

After Phase 4.3 acceptance:
- **Phase 4.2**: Sitter Messages UI
- **Future**: Auto-provision sitter masked numbers
- **Future**: Auto-update windows on booking time changes

---

## Rollback Plan

If Phase 4.3 causes issues:

1. **Disable feature flag**: Set `ENABLE_PROACTIVE_THREAD_CREATION=false`
2. **Verify**: Booking updates still work (thread creation skipped)
3. **Cleanup** (optional): Manually archive or delete threads if needed

Feature flag ensures zero-risk rollback.
