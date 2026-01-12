# Automation Trigger & Action Catalog

## Complete Trigger List

### Booking Category
1. **booking.created** - Fires when a new booking is created
2. **booking.updated** - Fires when any booking field is updated
3. **booking.statusChanged** - Fires when booking status changes (config: fromStatus, toStatus)
4. **booking.assigned** - Fires when a sitter is assigned (config: sitterTier)
5. **booking.unassigned** - Fires when a sitter is removed
6. **booking.upcomingReminder** - Fires at specified time before booking (config: hoursBefore)
7. **booking.completed** - Fires when booking is marked completed
8. **payment.linkSent** - Fires when payment link is sent
9. **payment.succeeded** - Fires when payment succeeds
10. **payment.tipReceived** - Fires when tip is received
11. **booking.visitMissed** - Fires when visit is missed/late (config: thresholdMinutes)

### Messaging Category
1. **message.conversationCreated** - Fires when conversation thread is created
2. **message.received** - Fires when message received from client
3. **message.notResponded** - Fires when not responded within X minutes (config: minutes)
4. **message.templateSent** - Fires when template message is sent (config: templateKey)
5. **message.sitterRequired** - Fires when sitter response is required

### Payroll Category
1. **payroll.periodOpened** - Fires when payroll period opens
2. **payroll.runGenerated** - Fires when payroll run is generated
3. **payroll.approved** - Fires when payroll is approved
4. **payroll.paid** - Fires when payroll is paid
5. **payroll.sitterPayoutException** - Fires on payout exception

### Sitter Category
1. **sitter.tierChanged** - Fires when tier changes (config: fromTier, toTier)
2. **sitter.joinedPool** - Fires when sitter joins pool
3. **sitter.removedFromPool** - Fires when sitter removed from pool
4. **sitter.inactive** - Fires when sitter marked inactive

### Calendar Category
1. **calendar.overbookingThreshold** - Fires when day exceeds threshold (config: threshold)
2. **calendar.unassignedThreshold** - Fires when unassigned exceed threshold (config: threshold)
3. **calendar.sameDayBooking** - Fires when same-day booking created

### Time Category
1. **time.scheduled** - Fires at specific time (config: time, timezone, daysOfWeek)
2. **time.relativeToBookingStart** - Relative to booking start (config: offset)
3. **time.relativeToBookingEnd** - Relative to booking end (config: offset)
4. **time.dailySummary** - Daily summary (config: time, timezone)
5. **time.weeklySummary** - Weekly summary (config: dayOfWeek, time, timezone)

## Complete Action List

### Messaging Actions
1. **sendSMS.client** - Send SMS to client (config: templateId, message, phone)
2. **sendSMS.sitter** - Send SMS to sitter (config: templateId, message, sitterId)
3. **sendInternalMessage** - Create internal message (config: message, threadId, assignTo)
4. **createMessageTask** - Create message task reminder (config: message, dueInMinutes, assignTo)

### Booking Actions
1. **changeBookingStatus** - Update booking status (config: status) [DESTRUCTIVE]
2. **assignSitter** - Assign sitter (config: sitterId, sitterTier) [DESTRUCTIVE]
3. **addSitterPool** - Add to pool (config: sitterIds) [DESTRUCTIVE]
4. **removeFromPool** - Remove from pool (config: sitterId) [DESTRUCTIVE]
5. **addInternalNote** - Add note (config: note)
6. **createFollowUpTask** - Create task (config: task, dueInMinutes, assignTo)

### Payment Actions
1. **generatePaymentLink** - Generate Stripe link (config: amount)
2. **sendPaymentLink** - Send link to client (config: linkUrl)
3. **markPaymentStatus** - Update payment status (config: status) [DESTRUCTIVE]
4. **notifyOwnerPaymentFailure** - Notify owner (config: message)

### Payroll Actions
1. **createPayrollAdjustment** - Create adjustment (config: sitterId, type, amount, reason) [DESTRUCTIVE]
2. **holdPayout** - Hold payout (config: sitterId, reason) [DESTRUCTIVE]
3. **notifyOwnerPayoutException** - Notify owner (config: message)
4. **generatePayrollReport** - Generate report (config: periodStart, periodEnd, sendTo)

### Admin Actions
1. **createAlert** - System alert (config: title, message, severity)
2. **postToNotifications** - Notification feed (config: message, type)
3. **escalateToOwner** - Escalate (config: message, priority)
4. **createChecklistItem** - Checklist item (config: item, assignTo, dueInMinutes)

## Condition Types

### Booking Conditions
- `booking.service` - Service type check
- `booking.status` - Status check
- `booking.dateRange` - Date range check
- `booking.sameDay` - Same day check
- `booking.isOvernight` - Overnight vs multi-visit
- `booking.totalValue` - Total value threshold
- `booking.petsCount` - Pets count check
- `booking.location` - Location contains
- `booking.isAssigned` - Assigned/unassigned
- `booking.sitterTier` - Sitter tier required
- `booking.sitterInPool` - Sitter in pool

### Client Conditions
- `client.isNew` - New client check
- `client.isVIP` - VIP client check
- `client.hasOverduePayment` - Overdue payment check
- `client.lifetimeValue` - Lifetime value threshold
- `client.lastBookingDate` - Last booking date check

## Template Variables

### Client Variables
- `{{client.firstName}}` - First name
- `{{client.lastName}}` - Last name
- `{{client.name}}` - Full name
- `{{client.phone}}` - Phone number
- `{{client.email}}` - Email address

### Sitter Variables
- `{{sitter.name}}` - Full name
- `{{sitter.firstName}}` - First name
- `{{sitter.tier}}` - Tier name

### Booking Variables
- `{{booking.service}}` - Service type
- `{{booking.date}}` - Booking date
- `{{booking.time}}` - Booking time
- `{{booking.schedule}}` - Full schedule
- `{{booking.address}}` - Address
- `{{booking.pets}}` - Pet information
- `{{booking.total}}` - Total price
- `{{booking.earnings}}` - Sitter earnings
- `{{booking.status}}` - Status

### Payment Variables
- `{{payment.link}}` - Payment link URL
- `{{payment.amount}}` - Payment amount
- `{{tip.link}}` - Tip link URL
- `{{tip.amount}}` - Tip amount

### Company Variables
- `{{company.name}}` - Business name
- `{{company.phone}}` - Business phone
