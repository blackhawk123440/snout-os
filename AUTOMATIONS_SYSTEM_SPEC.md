# Automations Control Center - System Specification

## Overview

The Enterprise Automations Control Center is a comprehensive system for creating, managing, testing, and auditing automation workflows. It replaces the previous settings-based approach with a full builder interface.

## Core Principles

1. **Mobile and desktop are the same system** - Only layout changes, no page-specific hacks
2. **Shared primitives only** - All components use design tokens
3. **No fake data** - If something cannot execute, it's clearly marked
4. **Every automation is inspectable** - Messages are readable and editable
5. **Every automation is testable** - Test mode without risking real clients
6. **Everything is logged** - Full audit trail via EventLog

## Data Models

### Automation
- `id`: UUID
- `name`: String
- `description`: String?
- `isEnabled`: Boolean
- `scope`: "global" | "org" | "sitter" | "client"
- `status`: "draft" | "active" | "paused" | "archived"
- `version`: Integer
- `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

### AutomationTrigger
- `automationId`: FK to Automation
- `triggerType`: String (e.g., "booking.created")
- `triggerConfig`: JSON

### AutomationConditionGroup
- `automationId`: FK to Automation
- `operator`: "all" | "any"
- `order`: Integer

### AutomationCondition
- `groupId`: FK to AutomationConditionGroup
- `conditionType`: String (e.g., "booking.service")
- `conditionConfig`: JSON
- `order`: Integer

### AutomationAction
- `automationId`: FK to Automation
- `actionType`: String (e.g., "sendSMS.client")
- `actionConfig`: JSON
- `order`: Integer

### AutomationTemplate
- `automationId`: FK to Automation
- `templateType`: "sms" | "email" | "internalMessage"
- `subject`: String? (for emails)
- `body`: String
- `variablesUsed`: JSON array
- `previewText`: String?
- `updatedAt`, `updatedBy`

### AutomationRun
- `automationId`: FK to Automation
- `triggeredAt`: DateTime
- `status`: "queued" | "running" | "success" | "failed" | "skipped" | "test"
- `reason`: String? (if skipped)
- `targetEntityType`: String? (booking, client, sitter, etc.)
- `targetEntityId`: String?
- `idempotencyKey`: String? (unique)
- `metadata`: JSON
- `correlationId`: String? (for EventLog)

### AutomationRunStep
- `automationRunId`: FK to AutomationRun
- `stepType`: "conditionCheck" | "actionExecute"
- `status`: "success" | "failed" | "skipped"
- `input`: JSON
- `output`: JSON
- `error`: JSON?
- `createdAt`: DateTime

## Trigger Catalog

### Booking Triggers
- `booking.created` - New booking created
- `booking.updated` - Booking updated
- `booking.statusChanged` - Status changed (with from/to filters)
- `booking.assigned` - Sitter assigned
- `booking.unassigned` - Sitter removed
- `booking.upcomingReminder` - Time-based reminder (X hours before)
- `booking.completed` - Booking completed
- `payment.linkSent` - Payment link sent
- `payment.succeeded` - Payment successful
- `payment.tipReceived` - Tip received
- `booking.visitMissed` - Visit missed or late

### Messaging Triggers
- `message.conversationCreated` - New conversation
- `message.received` - Message from client
- `message.notResponded` - Not responded within X minutes
- `message.templateSent` - Template message sent
- `message.sitterRequired` - Sitter response required

### Payroll Triggers
- `payroll.periodOpened` - Payroll period opened
- `payroll.runGenerated` - Payroll run generated
- `payroll.approved` - Payroll approved
- `payroll.paid` - Payroll paid
- `payroll.sitterPayoutException` - Payout exception

### Sitter Triggers
- `sitter.tierChanged` - Tier changed
- `sitter.joinedPool` - Joined pool
- `sitter.removedFromPool` - Removed from pool
- `sitter.inactive` - Marked inactive

### Calendar Triggers
- `calendar.overbookingThreshold` - Day exceeds threshold
- `calendar.unassignedThreshold` - Unassigned bookings exceed threshold
- `calendar.sameDayBooking` - Same-day booking created

### Time-based Triggers
- `time.scheduled` - At specific time
- `time.relativeToBookingStart` - Relative to booking start
- `time.relativeToBookingEnd` - Relative to booking end
- `time.dailySummary` - Daily summary
- `time.weeklySummary` - Weekly summary

## Condition Types

### Booking Conditions
- Service type (equals, in, notIn)
- Status (equals, in, notIn)
- Date range
- Same day
- Overnight vs multi-visit
- Total value threshold
- Pets count
- Location contains
- Assigned/unassigned
- Sitter tier required
- Sitter in pool contains

### Client Conditions
- New client
- VIP client
- Has overdue payment
- Lifetime value threshold
- Last booking date

## Action Types

### Messaging Actions
- `sendSMS.client` - Send SMS to client
- `sendSMS.sitter` - Send SMS to sitter
- `sendInternalMessage` - Internal message
- `createMessageTask` - Task reminder

### Booking Actions
- `changeBookingStatus` - Update status
- `assignSitter` - Assign sitter
- `addSitterPool` - Add to pool
- `removeFromPool` - Remove from pool
- `addInternalNote` - Add note
- `createFollowUpTask` - Create task

### Payment Actions
- `generatePaymentLink` - Generate link
- `sendPaymentLink` - Send link
- `markPaymentStatus` - Update status
- `notifyOwnerPaymentFailure` - Notify owner

### Payroll Actions
- `createPayrollAdjustment` - Create adjustment
- `holdPayout` - Hold payout
- `notifyOwnerPayoutException` - Notify owner
- `generatePayrollReport` - Generate report

### Admin Actions
- `createAlert` - System alert
- `postToNotifications` - Notification feed
- `escalateToOwner` - Escalate
- `createChecklistItem` - Checklist item

## Template System

### Variables
- Client: `{{client.firstName}}`, `{{client.lastName}}`, `{{client.name}}`, `{{client.phone}}`, `{{client.email}}`
- Sitter: `{{sitter.name}}`, `{{sitter.firstName}}`, `{{sitter.tier}}`
- Booking: `{{booking.service}}`, `{{booking.date}}`, `{{booking.time}}`, `{{booking.schedule}}`, `{{booking.address}}`, `{{booking.pets}}`, `{{booking.total}}`, `{{booking.earnings}}`, `{{booking.status}}`
- Payment: `{{payment.link}}`, `{{payment.amount}}`, `{{tip.link}}`, `{{tip.amount}}`
- Company: `{{company.name}}`, `{{company.phone}}`

### Features
- Live preview with example data
- Variable validation
- Character count for SMS
- Formatting rules

## Test Mode

Every automation has a "Test Run" button that:
- Lets user pick example entity (booking, client, sitter)
- Runs conditions and shows results
- Does NOT send real messages
- Does NOT change real booking status
- Logs run with status "test"
- Shows preview of what would happen

## Run History & Audit

### Run History UI
- Last run time
- Success rate
- Last error
- Recent runs list

### Run Detail
- Trigger payload snapshot
- Condition evaluation results
- Actions executed with outputs
- Messages sent with content preview
- Idempotency key
- Correlation ID to EventLog

## Schedule & Throttle

### Schedule Rules
- Timezone aware
- Quiet hours
- Rate limit per client per day
- Rate limit per booking per day

### Throttle Rules
- Max messages per hour per org
- Do not trigger same automation repeatedly for same entity within X minutes

## UI Structure

### Automations Page
- Top: Create button, Search, Filters (enabled, trigger type, status), Stats
- List: Name, Trigger summary, Enabled toggle, Last run status, Quick actions

### Builder Page
- Left Panel: Trigger, Conditions, Actions, Templates, Schedule, Safety
- Right Panel: Live preview, Message preview, Run history mini panel
- Mobile: Stacked layout, same content

## Integration Points

- Booking events → Trigger automations
- Messaging system → Trigger automations
- Payroll system → Trigger automations
- Sitter management → Trigger automations
- EventLog → Correlation for audit trail

## Safety Features

- Every action shows "Will do X to Y" preview
- Idempotency keys prevent duplicates
- Test mode for safe testing
- "Allow live actions" toggle (admin only)
- Destructive actions require confirmation
