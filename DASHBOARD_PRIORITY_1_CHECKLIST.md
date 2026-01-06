# Priority 1 Revenue Critical Automation Gaps - Manual Verification Checklist

**Date**: 2024-12-19  
**Viewport Tests**: 390x844 (iPhone 12 Pro) and 430x932 (iPhone 14 Pro Max)

---

## 1. Automation Settings Persistence

### Test: Save and Refresh
- [ ] Navigate to `/automation` page
- [ ] Change an automation setting (e.g., enable/disable an automation)
- [ ] Click "Save"
- [ ] Verify success message appears
- [ ] Refresh the page (F5 or Cmd+R)
- [ ] **Expected**: Settings persist and show the saved values
- [ ] **Evidence**: Settings match what was saved, not default values

### Test: Audit Log
- [ ] After saving automation settings, check EventLog
- [ ] Navigate to automation logs or EventLog table
- [ ] **Expected**: See `automation.settings.updated` event with status `success`
- [ ] **Evidence**: Event includes checksum, changedKeys, and timestamp in metadata

### Test: Multiple Saves
- [ ] Change automation settings multiple times
- [ ] Save after each change
- [ ] Refresh after each save
- [ ] **Expected**: Each save persists correctly, refresh shows latest values
- [ ] **Evidence**: No data loss or corruption

---

## 2. Payment Confirmation Pipeline

### Test: Stripe Payment Success
- [ ] Create a test booking with status `pending`
- [ ] Generate a payment link for the booking
- [ ] Complete payment via Stripe test mode
- [ ] **Expected**: 
  - `paymentStatus` becomes `paid`
  - `status` becomes `confirmed` (if was `pending`)
  - Booking confirmed message is sent to client
- [ ] **Evidence**: 
  - Check booking detail page shows `paymentStatus: paid` and `status: confirmed`
  - Check messages table for confirmation message
  - Check EventLog for `payment.webhook.success` event

### Test: Webhook Idempotency
- [ ] Send the same Stripe webhook event twice (simulate replay)
- [ ] **Expected**: 
  - First webhook processes successfully
  - Second webhook is skipped (idempotency check)
  - No duplicate messages sent
  - No duplicate status updates
- [ ] **Evidence**: 
  - EventLog shows `payment.webhook.duplicate` event for second webhook
  - Only one confirmation message in messages table
  - Booking status/paymentStatus unchanged on second webhook

### Test: Correlation IDs
- [ ] Process a payment webhook
- [ ] Check EventLog entries
- [ ] **Expected**: All related events have the same correlation ID
- [ ] **Evidence**: 
  - `payment.webhook.processing` has correlation ID
  - `payment.webhook.success` has same correlation ID
  - `automation.run` for bookingConfirmation has correlation ID in context

### Test: Status Transition
- [ ] Create booking with status `confirmed` (not `pending`)
- [ ] Process payment webhook
- [ ] **Expected**: 
  - `paymentStatus` becomes `paid`
  - `status` remains `confirmed` (not changed)
- [ ] **Evidence**: Booking detail shows correct statuses

---

## 3. Payment Link Generation and Message Send

### Test: Payment Link Total
- [ ] Navigate to booking detail page
- [ ] Click "Send Payment Link"
- [ ] Generate payment link
- [ ] **Expected**: Payment link amount matches booking total
- [ ] **Evidence**: 
  - Check Stripe payment link amount
  - Compare with booking detail page total
  - Should match exactly (within $0.01)

### Test: Message Template
- [ ] Generate payment link
- [ ] View message preview
- [ ] **Expected**: 
  - Message uses Leah's standard template
  - Variables are filled: `{{firstName}}`, `{{service}}`, `{{date}}`, `{{petQuantities}}`, `{{total}}`, `{{paymentLink}}`
  - Message is readable and formatted correctly
- [ ] **Evidence**: Preview shows complete message with all variables filled

### Test: Send Payment Link
- [ ] Generate payment link
- [ ] Click "Send Payment Link" in preview modal
- [ ] **Expected**: 
  - Message is sent to client via OpenPhone
  - Message appears in messages table
  - Success message appears in UI
- [ ] **Evidence**: 
  - Check messages table for outbound message
  - Check OpenPhone dashboard for sent message
  - Client receives message on their phone

### Test: Phone Number Validation
- [ ] Create booking without phone number (or empty phone)
- [ ] Try to send payment link
- [ ] **Expected**: Error message: "Cannot send payment link: Client phone number is missing"
- [ ] **Evidence**: Alert/error message appears, no API call made

### Test: Payment Link Copy
- [ ] Generate payment link
- [ ] Click copy button in preview modal
- [ ] **Expected**: Payment link URL is copied to clipboard
- [ ] **Evidence**: Paste in text editor shows correct URL

---

## 4. Tip Link Automation

### Test: Tip Link Calculation
- [ ] Complete a booking (set status to `completed`)
- [ ] Check tip link URL
- [ ] **Expected**: Tip link includes correct service amount
- [ ] **Evidence**: 
  - Tip link URL format: `/tip/t/{serviceAmount}/{sitterAlias}`
  - Service amount matches booking total
  - Tip calculations (10%, 15%, 20%, 25%) are correct

### Test: Tip Link Trigger
- [ ] Create booking with assigned sitter
- [ ] Set booking status to `completed`
- [ ] **Expected**: 
  - Tip link automation is triggered
  - Tip link is generated
  - Tip message is sent to client
- [ ] **Evidence**: 
  - EventLog shows `automation.tipLink.triggered` event
  - EventLog shows `automation.tipLink.sent` event
  - Messages table shows tip link message
  - Client receives tip link message

### Test: Tip Link Idempotency
- [ ] Set booking status to `completed` (triggers tip link)
- [ ] Wait for tip link to be sent
- [ ] Edit booking (change notes, etc.) - do NOT change status
- [ ] **Expected**: Tip link is NOT sent again
- [ ] **Evidence**: 
  - Only one tip link message in messages table
  - EventLog shows only one `automation.tipLink.sent` event

### Test: Tip Link Not Triggered for Cancelled
- [ ] Create booking with assigned sitter
- [ ] Set booking status to `cancelled`
- [ ] **Expected**: Tip link is NOT triggered
- [ ] **Evidence**: 
  - No `automation.tipLink.triggered` event in EventLog
  - No tip link message sent

### Test: Tip Link Not Triggered Without Sitter
- [ ] Create booking without assigned sitter
- [ ] Set booking status to `completed`
- [ ] **Expected**: Tip link is NOT triggered
- [ ] **Evidence**: 
  - No `automation.tipLink.triggered` event in EventLog
  - Automation executor returns skip reason: "no_sitter"

### Test: Tip Link Phone Validation
- [ ] Create booking with no phone number
- [ ] Set booking status to `completed` with assigned sitter
- [ ] **Expected**: Tip link generation fails with phone validation error
- [ ] **Evidence**: 
  - EventLog shows `automation.tipLink.sent` with status `failed`
  - Error message: "Cannot send tip link: Client phone number is missing"

---

## Mobile Viewport Tests

### Test: Payment Link Preview on Mobile
- [ ] Open booking detail on mobile (390x844)
- [ ] Generate payment link
- [ ] View preview modal
- [ ] **Expected**: 
  - Modal is full-height bottom sheet
  - No content cut off
  - Message preview is readable
  - Copy button is accessible
  - Send button is accessible
- [ ] **Evidence**: All elements visible and usable

### Test: Automation Settings on Mobile
- [ ] Open automation page on mobile (430x932)
- [ ] Edit automation settings
- [ ] Save settings
- [ ] **Expected**: 
  - Settings save successfully
  - Success message visible
  - Settings persist on refresh
- [ ] **Evidence**: Settings work correctly on mobile

---

## Revenue Safety Tests

### Test: Pricing Consistency
- [ ] Create booking with multiple pets and add-ons
- [ ] Check total on:
  - Booking detail page
  - Payment link amount
  - Calendar event
  - Payments page
- [ ] **Expected**: All totals match exactly
- [ ] **Evidence**: No discrepancies between surfaces

### Test: Payment Link Total Accuracy
- [ ] Create booking with:
  - Multiple pets
  - After-hours or holiday pricing
  - Discounts (if applicable)
- [ ] Generate payment link
- [ ] **Expected**: Payment link amount matches booking total
- [ ] **Evidence**: Stripe payment link shows correct amount

### Test: Tip Link Calculation Accuracy
- [ ] Complete booking with complex pricing
- [ ] Check tip link service amount
- [ ] **Expected**: Tip link amount matches booking total
- [ ] **Evidence**: Tip calculations (10%, 15%, 20%, 25%) are correct based on booking total

---

## Rollback Plan

If any test fails:

1. **Automation Settings**: 
   - Check `Setting` table for `key="automation"`
   - Verify JSON is valid
   - Check EventLog for errors

2. **Payment Confirmation**:
   - Check webhook logs
   - Verify idempotency keys in BullMQ
   - Check EventLog for correlation IDs

3. **Payment Link**:
   - Verify `calculatePriceBreakdown` function
   - Check message template in database
   - Verify OpenPhone integration

4. **Tip Link**:
   - Check tip link automation trigger logic
   - Verify idempotency key format
   - Check phone number validation

---

## Stop Conditions

**STOP IMMEDIATELY IF**:
- Payment link amount does not match booking total
- Duplicate messages are sent
- Settings do not persist after refresh
- Tip link triggers multiple times for same booking
- Phone validation is bypassed

---

## Sign-Off

- [ ] All tests passed
- [ ] No stop conditions triggered
- [ ] Revenue safety tests passed
- [ ] Mobile viewport tests passed
- [ ] Ready for production

**Tester**: _________________  
**Date**: _________________  
**Notes**: _________________

