# Smoke Test Checklist - Booking Detail Page & Revenue Safety

**Critical**: Test all items before enabling auth protection or deploying to production.

## 🔴 CRITICAL SECURITY FIXES APPLIED

- ✅ Added `/api/messages` to protected routes (prevents unauthorized message sending)
- ⚠️ **ACTION REQUIRED**: Verify `ENABLE_AUTH_PROTECTION` is enabled before production
- ⚠️ **ACTION REQUIRED**: Test authorization on all new endpoints with auth enabled

---

## 1. Smoke Test: Booking Detail Page Navigation

### Desktop
- [ ] Open bookings list page
- [ ] Click on a booking
- [ ] Verify booking detail page loads within 2 seconds
- [ ] Verify all sections render correctly (Summary, Schedule, Pets, Pricing, Notes)
- [ ] Click browser back button
- [ ] Verify returns to bookings list correctly

### Mobile
- [ ] Open bookings list on phone
- [ ] Tap a booking
- [ ] Verify page loads and displays correctly
- [ ] Verify tabs are scrollable (not cramped)
- [ ] Verify no horizontal scroll
- [ ] Tap back button
- [ ] Verify returns correctly

---

## 2. Edit Booking Modal - Low Risk Edits

### Prefill Verification
- [ ] Open Edit modal
- [ ] Verify all fields are prefilled correctly:
  - [ ] Client name (first/last)
  - [ ] Phone number
  - [ ] Email
  - [ ] Service type
  - [ ] Start date/time
  - [ ] End date/time
  - [ ] Address fields
  - [ ] Pet list
  - [ ] Notes

### Low Risk Edit Test
- [ ] Change notes field
- [ ] Save
- [ ] Refresh page
- [ ] Verify notes change persisted
- [ ] Check EventLog table (if accessible) - verify `booking.edited` event exists
- [ ] Check BookingStatusHistory - verify NO entry (status didn't change)

### Client Info Edit Test
- [ ] Change client phone number
- [ ] Save
- [ ] Refresh page
- [ ] Verify phone change persisted
- [ ] Verify audit log entry exists

---

## 3. High Risk Diff Gate

### Service Type Change
- [ ] Open Edit modal
- [ ] Change service type (e.g., "Dog Walking" → "Housesitting")
- [ ] Click Save
- [ ] **VERIFY**: Diff review modal appears
- [ ] **VERIFY**: Shows old service vs new service
- [ ] Click "Cancel" or "Back to Edit"
- [ ] **VERIFY**: Booking unchanged after cancel
- [ ] Change service again
- [ ] Click "Confirm Changes"
- [ ] **VERIFY**: Service change applied
- [ ] **VERIFY**: Pricing recalculated (if service affects pricing)

### Schedule Change
- [ ] Change start date/time
- [ ] Click Save
- [ ] **VERIFY**: Diff review shows old vs new date/time
- [ ] Confirm change
- [ ] **VERIFY**: Schedule updated
- [ ] **VERIFY**: Pricing recalculated if schedule affects pricing

### Pet Quantity Change
- [ ] Add or remove a pet
- [ ] Click Save
- [ ] **VERIFY**: Diff review shows pet count change
- [ ] Confirm change
- [ ] **VERIFY**: Pet list updated
- [ ] **VERIFY**: Pricing recalculated (pet count affects pricing)

### Address Change
- [ ] Change service address
- [ ] Click Save
- [ ] **VERIFY**: Diff review shows address change
- [ ] Confirm change
- [ ] **VERIFY**: Address updated

---

## 4. Pricing Recalculation Safety ⚠️ REVENUE CRITICAL

### Test Case 1: Multiple Pets
- [ ] Find or create booking with 3+ pets
- [ ] Note original total price
- [ ] Edit booking: Remove 1 pet
- [ ] Save
- [ ] **VERIFY**: New total is LESS than original
- [ ] **VERIFY**: Line items still reconcile to total
- [ ] Check Payments page - verify total matches
- [ ] Check Calendar - verify total matches

### Test Case 2: After Hours Booking
- [ ] Find booking with `afterHours: true`
- [ ] Note original total
- [ ] Edit: Change `afterHours` to `false`
- [ ] Save
- [ ] **VERIFY**: New total is LESS (after hours fee removed)
- [ ] **VERIFY**: All screens show same total

### Test Case 3: Holiday Booking
- [ ] Find booking with `holiday: true`
- [ ] Note original total
- [ ] Edit: Change `holiday` to `false`
- [ ] Save
- [ ] **VERIFY**: New total is LESS (holiday fee removed)
- [ ] **VERIFY**: All screens show same total

### Test Case 4: Schedule Change Affecting Duration
- [ ] Find booking with specific duration
- [ ] Note original total
- [ ] Edit: Change end time to extend duration by 1 hour
- [ ] Save
- [ ] **VERIFY**: New total is HIGHER (longer duration)
- [ ] **VERIFY**: All screens show same total

### Pricing Reconciliation Check
- [ ] After ANY pricing change, verify:
  - [ ] Booking detail page total = Payments page total
  - [ ] Booking detail page total = Calendar total
  - [ ] Line items sum to total
  - [ ] Pricing snapshot (if exists) matches total

**🚨 STOP IF ANY MISMATCH**: Do not proceed until pricing is unified across all screens.

---

## 5. Payment Link Flow

### Generate Payment Link
- [ ] Open booking detail
- [ ] Click "Send Payment Link" button
- [ ] **VERIFY**: Preview modal appears
- [ ] **VERIFY**: Shows correct:
  - [ ] Client name
  - [ ] Service type
  - [ ] Date/time
  - [ ] Total amount
  - [ ] **EXACT Leah message template** with variables filled:
     ```
     💳 PAYMENT REMINDER

     Hi [FirstName],

     Your [Service] booking on [Date] is ready for payment.

     Pets: [PetQuantities]
     Total: $[TotalPrice]

     Pay now: [PaymentLink]
     ```

### Send Payment Link
- [ ] Click "Send Payment Link" in preview
- [ ] **VERIFY**: Success message appears
- [ ] **VERIFY**: Message is logged in Message table (check database)
- [ ] **VERIFY**: Client actually receives SMS (test with your phone number)
- [ ] **VERIFY**: Payment link URL is correct and clickable

**🚨 CRITICAL**: If "send" succeeds but client never receives message, this is a silent failure - fix immediately.

---

## 6. Stripe Paid Confirmation Automation

### Test Payment Flow
- [ ] Generate payment link for a test booking
- [ ] Send payment link to YOUR phone number
- [ ] Click payment link
- [ ] Pay with Stripe test card (or small real amount)
- [ ] **VERIFY**: Webhook receives payment event
- [ ] **VERIFY**: Booking `paymentStatus` becomes "paid"
- [ ] **VERIFY**: Booking `status` becomes "confirmed" (if was pending)
- [ ] **VERIFY**: Booking confirmed message is sent automatically
- [ ] **VERIFY**: EventLog entry exists for payment success
- [ ] **VERIFY**: Booking confirmed automation runs (check automation queue/logs)
- [ ] **VERIFY**: Automation runs ONLY ONCE (check for duplicates)

### Idempotency Test
- [ ] Manually trigger webhook again with same payment event
- [ ] **VERIFY**: No duplicate messages sent
- [ ] **VERIFY**: Booking status doesn't change again
- [ ] **VERIFY**: Automation doesn't run again

**🚨 CRITICAL**: If duplicate messages appear, idempotency is broken - fix immediately.

---

## 7. Tip Link Automation on Completion

### Completion Trigger
- [ ] Find booking with assigned sitter
- [ ] Change booking status to "completed"
- [ ] **VERIFY**: Tip link is generated automatically
- [ ] **VERIFY**: Tip link message is sent to client
- [ ] **VERIFY**: EventLog entry exists
- [ ] **VERIFY**: Automation runs ONLY ONCE

### Idempotency Test
- [ ] Edit booking (change notes only - unrelated field)
- [ ] Save
- [ ] **VERIFY**: Tip link automation does NOT trigger
- [ ] Change status from "completed" to "confirmed" then back to "completed"
- [ ] **VERIFY**: Tip link automation triggers again (status changed)

### Edge Cases
- [ ] Complete booking WITHOUT assigned sitter
- [ ] **VERIFY**: Tip link automation does NOT trigger
- [ ] Cancel a booking
- [ ] **VERIFY**: Tip link automation does NOT trigger

---

## 8. Mobile UI Fixes Verification

Test these pages on your phone:

### Bookings List
- [ ] No cut off modals
- [ ] No cramped tabs
- [ ] Cards fit screen width
- [ ] Buttons are touch-friendly (44px min)
- [ ] No text overlapping
- [ ] No horizontal scroll

### Booking Detail
- [ ] Tabs scroll horizontally
- [ ] Modal is full-height (no cut off)
- [ ] Edit modal is full-height bottom sheet
- [ ] All buttons accessible
- [ ] No text wrapping issues

### Calendar
- [ ] Calendar fits screen
- [ ] No clipped content
- [ ] Navigation buttons work
- [ ] Event cards readable

### Automations
- [ ] List is scrollable
- [ ] Cards don't overflow
- [ ] Forms are usable

### Payments
- [ ] Table scrolls horizontally if needed
- [ ] No layout breaks
- [ ] All data visible

### Settings
- [ ] Forms stack correctly
- [ ] Inputs are 16px+ (no iOS zoom)
- [ ] Save buttons accessible

### Sitter Management
- [ ] List displays correctly
- [ ] Forms are usable
- [ ] No layout issues

**🚨 STOP IF ANY PAGE LOOKS BAD**: Global rules didn't fully cover it - fix before proceeding.

---

## 9. Authorization Verification

### Before Enabling Auth Protection
- [ ] Test all endpoints work without auth (current state)
- [ ] Document which endpoints need protection

### After Enabling Auth Protection
- [ ] Test `/api/bookings/[id]/edit` requires auth
- [ ] Test `/api/messages/send` requires auth
- [ ] Test `/api/payments/create-payment-link` requires auth
- [ ] Test `/api/payments/create-tip-link` requires auth
- [ ] Verify public routes still work:
  - [ ] `/api/form` (booking form submission)
  - [ ] `/api/webhooks/stripe` (webhook endpoint)
  - [ ] Health check endpoints

---

## 10. Audit Trail Verification

### EventLog Checks
- [ ] Every booking edit creates `booking.edited` event
- [ ] Event includes:
  - [ ] Changed fields list
  - [ ] High risk flag
  - [ ] Pricing changed flag
  - [ ] Old/new prices (if pricing changed)
  - [ ] User who made change

### Status History Checks
- [ ] Status change creates BookingStatusHistory entry
- [ ] Status history includes:
  - [ ] From status
  - [ ] To status
  - [ ] Changed by user
  - [ ] Timestamp
- [ ] Non-status edits do NOT create status history

---

## 🚨 CRITICAL FAILURES - STOP IMMEDIATELY

If any of these occur, **STOP** and fix before proceeding:

1. **Pricing Mismatch**: Any screen shows different total than booking detail
2. **Duplicate Messages**: Same message sent multiple times
3. **Silent Message Failure**: "Send" succeeds but message never arrives
4. **Pricing Not Recalculated**: Edit changes pricing factors but total doesn't update
5. **Authorization Bypass**: Protected endpoints accessible without auth
6. **Data Loss**: Edit saves but data doesn't persist

---

## Next Steps After All Tests Pass

1. ✅ Sitters admin view + mobile fixes
2. ✅ Settings subpages (Pricing, Services, Discounts)
3. ✅ Templates and automation builder
4. ✅ Integrations
5. ✅ Exceptions

---

## Notes

- All pricing changes must use the same calculation logic as booking creation
- All automations must be idempotent (use unique job IDs)
- All message sends must be logged and verifiable
- All edits must create audit trail entries

