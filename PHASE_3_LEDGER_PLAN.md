# Phase 3.2: Automation Run Ledger - Implementation Plan

**Master Spec Reference**: Line 257
"Add an automation run ledger page that shows last runs and failures"

## Implementation Plan

### 1. Create EventLog Model (Foundation for Audit Backbone)

Per master spec, EventLog is the audit backbone. We need to create a model that tracks:
- Automation run events (automationType, status, bookingId, etc.)
- Success/failure status
- Error messages
- Timestamps
- Execution metadata

### 2. Update Event Emitter to Log Automation Runs

Update automation execution points to log to EventLog when automations run.

### 3. Create API Endpoint

Create `/api/automations/ledger` endpoint to fetch automation runs.

### 4. Create UI Page

Create `/settings/automations/ledger` page to display the ledger.

## EventLog Model Schema

```prisma
model EventLog {
  id              String   @id @default(uuid())
  eventType       String   // e.g., "automation.run", "booking.created", etc.
  automationType  String?  // e.g., "bookingConfirmation", "nightBeforeReminder"
  status          String   // "success", "failed", "skipped"
  error           String?  @db.Text
  metadata        String?  @db.Text // JSON string for additional context
  bookingId       String?
  booking         Booking? @relation(fields: [bookingId], references: [id], onDelete: SetNull)
  createdAt       DateTime @default(now())

  @@index([eventType])
  @@index([automationType])
  @@index([status])
  @@index([bookingId])
  @@index([createdAt])
}
```

