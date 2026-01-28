# UI Wiring Plan

## Overview
This document maps each frontend page to its required API endpoints, request/response shapes, and identifies missing backend endpoints.

---

## A) Inbox (Owner) - `/inbox`

### Required Endpoints

#### ✅ Existing
- `GET /api/threads` - List threads with filters
  - Query params: `clientId?`, `sitterId?`, `status?`, `unreadOnly?`, `hasPolicyViolation?`, `hasDeliveryFailure?`
  - Response: `Thread[]` with `client`, `sitter`, `messageNumber`, `ownerUnreadCount`

- `GET /api/messages/threads/:threadId` - Get messages for thread
  - Response: `Message[]` with `deliveries[]`, `policyViolations[]`

- `POST /api/messages/send` - Send message
  - Body: `{ threadId: string, body: string, forceSend?: boolean }`
  - Response: `{ messageId: string, providerMessageSid?: string, hasPolicyViolation: boolean }`

- `POST /api/messages/:messageId/retry` - Retry failed delivery
  - Response: `{ success: boolean, attemptNo: number }`

#### ❌ Missing (Need to Add)
- `GET /api/threads/:threadId` - Get single thread with full details
- `GET /api/routing/threads/:threadId/history` - Get routing history (placeholder exists, needs implementation)
- `POST /api/routing/overrides` - Create routing override
- `DELETE /api/routing/overrides/:id` - Remove routing override
- `PATCH /api/threads/:threadId/mark-read` - Mark thread as read

### Request/Response Shapes

```typescript
// GET /api/threads
interface Thread {
  id: string;
  orgId: string;
  clientId: string;
  sitterId?: string;
  numberId: string;
  threadType: 'front_desk' | 'assignment' | 'pool' | 'other';
  status: 'active' | 'inactive';
  ownerUnreadCount: number;
  lastActivityAt: Date;
  client: { id: string; name: string; contacts: Array<{ e164: string }> };
  sitter?: { id: string; name: string };
  messageNumber: { id: string; e164: string; class: string; status: string };
}

// GET /api/messages/threads/:threadId
interface Message {
  id: string;
  threadId: string;
  direction: 'inbound' | 'outbound';
  senderType: 'client' | 'sitter' | 'owner' | 'system' | 'automation';
  senderId?: string;
  body: string;
  redactedBody?: string;
  hasPolicyViolation: boolean;
  createdAt: Date;
  deliveries: Array<{
    id: string;
    attemptNo: number;
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    providerErrorCode?: string;
    providerErrorMessage?: string;
    createdAt: Date;
  }>;
  policyViolations: Array<{
    id: string;
    violationType: string;
    detectedSummary: string;
    actionTaken: string;
  }>;
}
```

---

## B) Setup Wizard - `/setup`

### Required Endpoints

#### ✅ Existing
- `POST /api/setup/test-connection` - Test provider connection
  - Body: `{ accountSid?: string, authToken?: string }`
  - Response: `{ success: boolean, error?: string }`

- `GET /api/setup/readiness` - Check system readiness
  - Response: `{ ready: boolean, checks: Array<{ name: string, passed: boolean, error?: string }> }`

#### ❌ Missing (Need to Add)
- `POST /api/setup/connect-provider` - Save provider credentials
  - Body: `{ accountSid: string, authToken: string }`
- `POST /api/setup/select-front-desk` - Select/purchase front desk number
  - Body: `{ e164: string }` or `{ purchase: true, areaCode?: string }`
- `POST /api/setup/select-sitter-numbers` - Select/purchase sitter numbers
  - Body: `{ numbers: string[] }`
- `POST /api/setup/select-pool-numbers` - Select/purchase pool numbers
  - Body: `{ numbers: string[] }`
- `GET /api/setup/webhook-status` - Check webhook installation status
- `POST /api/setup/install-webhooks` - Install webhooks (if needed)

---

## C) Number Inventory - `/numbers`

### Required Endpoints

#### ✅ Existing
- `GET /api/numbers` - List numbers
  - Query params: `class?`, `status?`, `assignedSitterId?`
  - Response: `MessageNumber[]` with `assignedSitter`

- `POST /api/numbers/purchase` - Purchase number
  - Body: `{ e164: string, class: string }`
  - Response: `MessageNumber`

- `POST /api/numbers/:id/quarantine` - Quarantine number
  - Body: `{ reason: string }`
  - Response: `MessageNumber`

#### ❌ Missing (Need to Add)
- `GET /api/numbers/:id` - Get number details with health metrics
- `POST /api/numbers/:id/release` - Release from quarantine (after cooldown)
- `POST /api/numbers/:id/assign` - Assign number to sitter
  - Body: `{ sitterId: string }`
- `POST /api/numbers/:id/release-to-pool` - Release sitter number to pool
- `GET /api/numbers/:id/impact-preview` - Preview quarantine impact
  - Response: `{ affectedThreadCount: number, affectedSitterId?: string }`
- `GET /api/numbers/:id/health` - Get number health metrics
  - Response: `{ deliveryRate: number, failureRate: number, last7DaysFailures: number }`

---

## D) Audit & Compliance - `/audit`

### Required Endpoints

#### ✅ Existing
- `GET /api/audit/events` - Query audit events
  - Query params: `eventType?`, `actorType?`, `entityType?`, `entityId?`, `startDate?`, `endDate?`, `limit?`, `offset?`
  - Response: `AuditEvent[]`

- `POST /api/audit/export` - Export to CSV
  - Query params: `startDate?`, `endDate?`, `eventTypes?`
  - Response: `{ csv: string, contentType: string }`

#### ❌ Missing (Need to Add)
- `GET /api/policy/violations` - List policy violations
  - Query params: `threadId?`, `status?`, `violationType?`
  - Response: `PolicyViolation[]`
- `PATCH /api/policy/violations/:id` - Update violation status
  - Body: `{ status: 'open' | 'resolved' | 'dismissed' }`
- `GET /api/messages/delivery-failures` - List delivery failures
  - Query params: `threadId?`, `startDate?`, `endDate?`
  - Response: `Message[]` with failed deliveries

---

## E) Automations UI - `/automations`

### Required Endpoints

#### ✅ Existing
- `GET /api/automations` - List automations
  - Response: `Automation[]`

- `POST /api/automations/:id/test` - Test automation
  - Body: `{ context: Record<string, unknown> }`
  - Response: `{ status: 'test_queued' }`

- `POST /api/automations/:id/activate` - Activate automation
  - Response: `{ status: 'active' }`

#### ❌ Missing (Need to Add)
- `POST /api/automations` - Create automation
  - Body: `CreateAutomationSchema`
- `GET /api/automations/:id` - Get automation details
- `PATCH /api/automations/:id` - Update automation
- `DELETE /api/automations/:id` - Delete automation
- `GET /api/automations/:id/executions` - Get execution logs
  - Query params: `limit?`, `offset?`, `status?`
  - Response: `AutomationExecution[]`
- `GET /api/automations/:id/executions/:executionId` - Get execution details

---

## F) Routing Control - `/routing`

### Required Endpoints

#### ✅ Existing
- `POST /api/routing/simulate` - Simulate routing
  - Body: `{ threadId?: string, clientId?: string, timestamp?: Date, numberId?: string }`
  - Response: `RoutingDecision`

- `GET /api/routing/threads/:threadId/history` - Get routing history (placeholder)

#### ❌ Missing (Need to Add)
- `POST /api/routing/overrides` - Create routing override
  - Body: `{ threadId: string, target: RoutingTarget, targetId?: string, durationHours?: number, reason: string }`
- `GET /api/routing/overrides` - List overrides
  - Query params: `threadId?`, `activeOnly?`
- `DELETE /api/routing/overrides/:id` - Remove override
  - Body: `{ reason?: string }`
- `GET /api/routing/threads/:threadId/history` - Implement properly (query audit events)

---

## G) Alerts & Escalation - `/alerts`

### Required Endpoints

#### ✅ Existing
- `GET /api/alerts` - List alerts
  - Response: `Alert[]` (only open alerts currently)

#### ❌ Missing (Need to Add)
- `GET /api/alerts` - Add query params: `status?`, `severity?`, `type?`
- `PATCH /api/alerts/:id/resolve` - Resolve alert
  - Body: `{ resolutionNote?: string }`
- `PATCH /api/alerts/:id/dismiss` - Dismiss alert (if not critical)
  - Response: Error if critical
- `GET /api/alerts/:id` - Get alert details

---

## H) Assignments & Windows - `/assignments`

### Required Endpoints

#### ✅ Existing
- `GET /api/assignments/windows` - List assignment windows
  - Response: `AssignmentWindow[]` with `thread`, `sitter`

#### ❌ Missing (Need to Add)
- `POST /api/assignments/windows` - Create assignment window
  - Body: `{ threadId: string, sitterId: string, startsAt: Date, endsAt: Date, bookingRef?: string }`
- `GET /api/assignments/windows/:id` - Get window details
- `PATCH /api/assignments/windows/:id` - Update window
- `DELETE /api/assignments/windows/:id` - Delete window
  - Response: `{ affectedThreads: number }` (impact preview)
- `GET /api/assignments/windows/conflicts` - Check for conflicts
  - Query params: `threadId`, `startsAt`, `endsAt`, `excludeWindowId?`
  - Response: `{ hasConflict: boolean, conflictingWindows: AssignmentWindow[] }`
- `GET /api/assignments/windows/calendar` - Get calendar view
  - Query params: `startDate`, `endDate`, `sitterId?`
  - Response: `{ windows: AssignmentWindow[], conflicts: Conflict[] }`

---

## I) Minimal Sitter UI - `/sitter`

### Required Endpoints

#### ✅ Existing
- `GET /api/threads` - Can filter by `sitterId` and active windows
- `GET /api/messages/threads/:threadId` - Same as owner
- `POST /api/messages/send` - Same as owner (but policy blocks sitter violations)

#### ❌ Missing (Need to Add)
- `GET /api/sitter/assigned-threads` - Get threads with active assignment windows
  - Response: `Thread[]` filtered to only active windows
- `GET /api/sitter/active-windows` - Get sitter's active windows
  - Response: `AssignmentWindow[]`

---

## Additional Endpoints Needed

### Auth
- `POST /api/auth/register` - Register (if needed)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout (optional)

### Settings
- `GET /api/settings` - Get settings
- `PATCH /api/settings` - Update settings
  - Body: `{ supportDiagnostics?: boolean, ... }`

### Clients (for dropdowns)
- `GET /api/clients` - List clients
- `GET /api/sitters` - List sitters

---

## Implementation Order

1. ✅ **A) Inbox** - Complete first
2. ✅ **B) Setup Wizard** - Complete second
3. ✅ **C) Number Inventory** - Complete third
4. ✅ **D) Audit & Compliance** - Complete fourth
5. ✅ **E) Automations UI** - Complete fifth
6. ✅ **F) Routing Control** - Complete sixth
7. ✅ **G) Alerts & Escalation** - Complete seventh
8. ✅ **H) Assignments & Windows** - Complete eighth
9. ✅ **I) Minimal Sitter UI** - Complete last

---

## Shared Infrastructure Needed

1. **Typed API Client** (`apps/web/lib/api/client.ts`)
   - Base URL configuration
   - JWT token handling (localStorage)
   - Error normalization
   - Zod response validation

2. **React Query Hooks** (`apps/web/lib/api/hooks.ts`)
   - `useThreads()`, `useMessages()`, `useSendMessage()`, etc.

3. **Auth Context** (`apps/web/lib/auth.ts`)
   - User state management
   - Route guards
   - Role checks

4. **Real-time Polling** (`apps/web/lib/polling.ts`)
   - Conditional polling (only when page visible)
   - 2-5s intervals for inbox

5. **Toast System** (shadcn/ui toast)
   - Success/error notifications

6. **Confirmation Dialogs** (shadcn/ui dialog)
   - Impact previews
   - Reason fields
   - Guardrails
