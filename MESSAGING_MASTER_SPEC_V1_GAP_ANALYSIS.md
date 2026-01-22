# Messaging Master Spec V1 - Gap Analysis & Execution Plan

**Date:** 2026-01-19  
**Status:** Analysis Complete - Awaiting Approval  
**Spec Authority:** Messaging Master Spec V1 (Canonical)

---

## Executive Summary

The Messaging Master Spec V1 introduces **three distinct number classes** and **assignment-window-based routing** that significantly extends beyond the current Gate 1 and Gate 2 foundation. The current implementation provides basic masking via Proxy Sessions but lacks the **dedicated number management**, **assignment window enforcement**, and **anti-poaching** requirements specified in the Master Spec.

---

## 1. Spec Acknowledgment & Conflict Check

### ✅ No Conflicts with Gate 1/2 Foundation

**Gate 1 Foundation (Preserved):**
- ✅ Provider abstraction layer (`MessagingProvider` interface)
- ✅ MessageThread, MessageParticipant, MessageEvent models
- ✅ Webhook signature verification infrastructure
- ✅ Org isolation enforcement
- ✅ Audit-friendly storage (ThreadAssignmentAudit, ResponseRecord)

**Gate 2 Foundation (Preserved):**
- ✅ Proxy Session management (`providerSessionSid`, `maskedNumberE164`)
- ✅ Thread assignment with routing updates
- ✅ Responsibility snapshots (`responsibleSitterIdSnapshot`)
- ✅ Provider participant management (`providerParticipantSid`)

**Spec Requirements (New):**
- Three number classes (Front Desk, Sitter Masked, Pool)
- Assignment window enforcement
- Anti-poaching detection
- Meet-and-greet workflows
- Weekly thread persistence
- Assignment-based routing rules

**Conclusion:** No architectural conflicts. The Master Spec builds on the existing foundation.

---

## 2. Gap Analysis: Current vs. Master Spec

### 2.1 Number Management Gaps

| Requirement | Current State | Gap |
|------------|---------------|-----|
| **Front Desk Number** (1 permanent) | ❌ No dedicated front desk number concept | Missing: Single persistent owner number for all non-assigned client threads |
| **Sitter Masked Numbers** (1 per active sitter, persistent) | ❌ No sitter-specific numbers | Missing: Dedicated masked number assignment per sitter, lifecycle management |
| **Rotating Pool Numbers** (one-off/overflow) | ❌ No pool number concept | Missing: Pool of numbers for temporary assignments, rotation logic |

**Current Implementation:**
- `MessageNumber` model exists but unused
- `maskedNumberE164` on MessageThread (session-level, not sitter-specific)
- No distinction between Front Desk, Sitter, or Pool numbers

---

### 2.2 Thread Lifecycle & Routing Gaps

| Requirement | Current State | Gap |
|------------|---------------|-----|
| **Weekly client threads persist** | ⚠️ Partial: Threads persist but no weekly scope logic | Missing: Explicit weekly thread scoping, persistence rules |
| **Messages outside booking route to owner** | ❌ No assignment window checking | Missing: Routing logic based on active booking windows, fallback to owner |
| **Sitters message only during assignment windows** | ❌ No window enforcement | Missing: Assignment window validation before allowing sitter sends |
| **Meet-and-greet transition** (front desk → sitter number) | ❌ No meet-and-greet workflow | Missing: Approval-based number transition workflow |

**Current Implementation:**
- Thread scope: `client_booking`, `client_general`, `owner_sitter`, `internal`
- No assignment window enforcement
- No meet-and-greet approval workflow
- Routing logic: Simple `assignedSitterId` check, no window validation

---

### 2.3 Anti-Poaching Enforcement Gaps

| Requirement | Current State | Gap |
|------------|---------------|-----|
| **Block messages with phone numbers** | ❌ No detection | Missing: Phone number regex detection in message body |
| **Block external contact info** | ❌ No detection | Missing: Email, URL, social media detection |
| **Friendly warning to sender** | ❌ No warning system | Missing: Automated warning message to sender |
| **Flag for owner review** | ❌ No flagging | Missing: Audit flag, owner notification |
| **Audit logging** | ⚠️ Partial: ThreadAssignmentAudit exists | Missing: Anti-poaching attempt audit records |

**Current Implementation:**
- No content scanning
- No poaching attempt detection
- No warning messages

---

### 2.4 Sitter Lifecycle Gaps

| Requirement | Current State | Gap |
|------------|---------------|-----|
| **Onboarding assigns dedicated masked number** | ❌ No automatic assignment | Missing: Sitter onboarding workflow triggers number assignment |
| **Offboarding deactivates number immediately** | ❌ No deactivation | Missing: Sitter offboarding workflow triggers number deactivation |
| **Client reassignment on offboarding** | ❌ No reassignment logic | Missing: Automatic thread reassignment when sitter offboards |

**Current Implementation:**
- No sitter onboarding/offboarding messaging workflows
- No automatic number assignment/deactivation

---

### 2.5 One-Time Client Handling Gaps

| Requirement | Current State | Gap |
|------------|---------------|-----|
| **One-time clients use rotating pool numbers** | ❌ No pool assignment | Missing: Pool number assignment for one-time clients |
| **Post-release routing to owner** | ❌ No post-release logic | Missing: Detection of messages after booking release, owner routing |
| **Auto-response after release** | ❌ No auto-response | Missing: Automated "this booking is complete" response |

**Current Implementation:**
- No distinction between one-time and recurring clients
- No pool number rotation logic

---

### 2.6 Billing Isolation Gaps

| Requirement | Current State | Gap |
|------------|---------------|-----|
| **Billing isolated to owner relationship threads** | ⚠️ Unknown: No billing integration yet | Needs clarification: What threads qualify for billing? Owner-client threads only? |
| **Owner visibility/override** | ⚠️ Partial: Owner can view, no override UI | Missing: Explicit override UI, full visibility dashboard |
| **Audit access** | ✅ Present: ThreadAssignmentAudit, EventLog | Complete: Audit infrastructure exists |

**Current Implementation:**
- ThreadAssignmentAudit for assignment changes
- EventLog for system events
- No explicit billing thread tagging

---

## 3. Schema Changes Required

### 3.1 New Fields on Existing Models

**MessageNumber:**
```prisma
model MessageNumber {
  // ... existing fields ...
  
  // NEW FIELDS:
  numberClass        String   @default("pool") // "front_desk" | "sitter" | "pool"
  assignedSitterId   String?  // For sitter numbers
  ownerId            String?  // For front desk numbers
  isRotating         Boolean  @default(false) // For pool numbers
  rotationPriority   Int?     // For pool number rotation
  lastAssignedAt     DateTime? // For pool rotation tracking
  
  @@index([numberClass])
  @@index([assignedSitterId])
}
```

**MessageThread:**
```prisma
model MessageThread {
  // ... existing fields ...
  
  // NEW FIELDS:
  numberClass        String?  // "front_desk" | "sitter" | "pool" (inherited from assigned number)
  assignmentWindowId String?  // Link to active booking assignment window
  isOneTimeClient    Boolean  @default(false)
  isMeetAndGreet     Boolean  @default(false)
  meetAndGreetApprovedAt DateTime?
  
  @@index([numberClass])
  @@index([assignmentWindowId])
}
```

**MessageEvent:**
```prisma
model MessageEvent {
  // ... existing fields ...
  
  // NEW FIELDS:
  antiPoachingFlagged  Boolean  @default(false)
  antiPoachingReason   String?  // Why it was flagged
  wasBlocked          Boolean  @default(false) // If message was blocked
  
  @@index([antiPoachingFlagged])
}
```

### 3.2 New Models Required

**SitterMaskedNumber:**
```prisma
model SitterMaskedNumber {
  id                String   @id @default(uuid())
  orgId             String
  sitterId          String   @unique
  messageNumberId   String   // FK to MessageNumber
  providerParticipantSid String? // Provider's participant ID
  status            String   @default("active") // active, deactivated, reassigned
  assignedAt        DateTime @default(now())
  deactivatedAt     DateTime?
  
  sitter            Sitter   @relation(fields: [sitterId], references: [id], onDelete: Cascade)
  messageNumber     MessageNumber @relation(fields: [messageNumberId], references: [id])
  
  @@index([orgId])
  @@index([sitterId])
  @@index([status])
}
```

**AssignmentWindow:**
```prisma
model AssignmentWindow {
  id                String   @id @default(uuid())
  orgId             String
  threadId          String
  bookingId         String
  sitterId          String
  startAt           DateTime
  endAt             DateTime
  status            String   @default("active") // active, expired, closed
  
  thread            MessageThread @relation(fields: [threadId], references: [id])
  booking           Booking       @relation(fields: [bookingId], references: [id])
  sitter            Sitter        @relation(fields: [sitterId], references: [id])
  
  @@index([orgId])
  @@index([threadId])
  @@index([bookingId])
  @@index([sitterId])
  @@index([status])
  @@index([startAt, endAt])
}
```

**AntiPoachingAttempt:**
```prisma
model AntiPoachingAttempt {
  id                String   @id @default(uuid())
  orgId             String
  threadId          String
  eventId           String   // FK to MessageEvent
  actorType         String   // client | sitter
  actorId           String?
  violationType     String   // phone_number | email | url | social_media
  detectedContent   String   @db.Text // The flagged content
  action            String   @default("blocked") // blocked | warned | flagged
  ownerNotifiedAt   DateTime?
  resolvedAt        DateTime?
  resolvedByUserId  String?
  
  thread            MessageThread @relation(fields: [threadId], references: [id])
  event             MessageEvent  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  @@index([orgId])
  @@index([threadId])
  @@index([eventId])
  @@index([action])
}
```

### 3.3 Model Relations Required

**Sitter Model:**
```prisma
model Sitter {
  // ... existing fields ...
  
  // NEW RELATIONS:
  maskedNumber      SitterMaskedNumber?
  assignmentWindows AssignmentWindow[]
}
```

**Booking Model:**
```prisma
model Booking {
  // ... existing fields ...
  
  // NEW RELATIONS:
  assignmentWindows AssignmentWindow[]
}
```

---

## 4. Migration Risks & Backward Compatibility

### 4.1 Schema Migration Risks

**Risk 1: MessageNumber Data Migration**
- **Issue:** Existing `MessageNumber` records have no `numberClass`
- **Impact:** Medium - need to categorize existing numbers
- **Mitigation:** Default all existing to "pool", add migration script to identify front desk number

**Risk 2: Thread.numberClass Backfill**
- **Issue:** Existing threads have no `numberClass`
- **Impact:** Low - can derive from current assignment state
- **Mitigation:** Migration script to infer from `assignedSitterId` and `scope`

**Risk 3: Missing Assignment Windows**
- **Issue:** Existing threads may have active assignments without windows
- **Impact:** Medium - sitters won't be able to message until windows created
- **Mitigation:** Backfill assignment windows for active bookings at migration time

### 4.2 Backward Compatibility Concerns

**Concern 1: Direct Send Fallback**
- **Current:** Falls back to direct send if no Proxy Session
- **Master Spec:** Always use masking (no direct send allowed)
- **Impact:** Breaking change for threads without sessions
- **Resolution:** Must ensure all threads have sessions before enforcing

**Concern 2: Thread Scope Values**
- **Current:** `client_booking`, `client_general`, `owner_sitter`, `internal`
- **Master Spec:** Implies weekly threads, assignment windows
- **Impact:** May need new scope values or migration
- **Resolution:** Keep existing scopes, add `numberClass` for routing logic

**Concern 3: Existing Sitter Assignments**
- **Current:** `assignedSitterId` on thread
- **Master Spec:** Assignment windows with start/end times
- **Impact:** Existing assignments are "permanent" until manually changed
- **Resolution:** Create assignment windows for existing assignments with unbounded end date

---

## 5. Ambiguous Areas Requiring Clarification

### 5.1 Number Assignment Rules

**Question 1: Front Desk Number Assignment**
- When does a client thread use Front Desk vs. Pool?
- Is it: "All threads without active assignment use Front Desk"?
- Or: "New clients always start with Pool, transition to Front Desk"?

**Question 2: Sitter Number Reassignment**
- If a sitter is offboarded, what happens to their dedicated number?
- Immediate reassignment to new sitter?
- Or: Deactivate and assign new number to new sitter?

**Question 3: Pool Number Rotation**
- How often do pool numbers rotate?
- Per booking? Per week? Per month?
- What triggers rotation (booking release, time-based)?

### 5.2 Assignment Window Rules

**Question 4: Window Duration**
- Does assignment window = booking start/end time?
- Or: Include buffer time (e.g., 1 hour before/after)?
- What about extended bookings (overnight, multi-day)?

**Question 5: Multiple Bookings Same Client**
- If client has multiple active bookings with different sitters, how are messages routed?
- Most recent booking? First active booking? Owner decides?

**Question 6: Booking Completion**
- When does assignment window close?
- At booking end time? After client confirms completion? Owner closes?
- What happens to messages during grace period?

### 5.3 One-Time Client Detection

**Question 7: One-Time vs. Recurring**
- How is a client classified as "one-time"?
- No bookings in last 90 days? Explicit flag? Booking count threshold?

**Question 8: Post-Release Window**
- How long after booking release do messages route to owner?
- Forever? 7 days? 30 days?
- What triggers "release" (booking status change, explicit release action)?

### 5.4 Anti-Poaching Rules

**Question 9: Detection Patterns**
- Phone number regex: What formats? International? Partial matches?
- External contact: Emails? URLs? Social handles (@username)?
- False positives: What about legitimate references (e.g., "call the vet at 555-1234")?

**Question 10: Enforcement Actions**
- First offense: Warning only? Block immediately?
- Escalation: Multiple warnings = permanent block?
- Owner override: Can owner unblock if false positive?

### 5.5 Meet-and-Greet Workflow

**Question 11: Approval Process**
- Who approves meet-and-greets? Owner only? Automated?
- What triggers approval (explicit action, booking status change)?
- What happens during pending approval (messages still to Front Desk)?

### 5.6 Billing Isolation

**Question 12: Billing Thread Criteria**
- Which threads qualify for billing? Owner-client threads only?
- Exclude internal threads? Sitter-owner threads?
- How is "owner relationship thread" defined (scope? numberClass?)?

---

## 6. Execution Plan

### Phase 1: Foundation & Number Management (Epic 1)

**Epic 1.1: Number Class Infrastructure**
- **Goal:** Implement three number classes (Front Desk, Sitter, Pool)
- **Tasks:**
  1. Extend `MessageNumber` schema with `numberClass`, assignment fields
  2. Create `SitterMaskedNumber` model for sitter-specific numbers
  3. Implement number assignment logic (Front Desk = 1, Sitter = on-demand, Pool = rotation)
  4. Create number lifecycle management (assign, deactivate, reassign)
- **Acceptance Criteria:**
  - ✅ One Front Desk number can be assigned per org
  - ✅ Sitter onboarding triggers masked number assignment
  - ✅ Sitter offboarding deactivates number
  - ✅ Pool numbers can be rotated

**Epic 1.2: Thread-Number Association**
- **Goal:** Link threads to number classes
- **Tasks:**
  1. Add `numberClass` to `MessageThread`
  2. Implement thread-to-number assignment logic
  3. Migrate existing threads to appropriate number classes
- **Acceptance Criteria:**
  - ✅ All threads have `numberClass` assigned
  - ✅ Thread routing uses correct number class
  - ✅ Backward compatibility maintained

---

### Phase 2: Assignment Window Enforcement (Epic 2)

**Epic 2.1: Assignment Window Model**
- **Goal:** Track active sitter assignment periods
- **Tasks:**
  1. Create `AssignmentWindow` model
  2. Implement window creation/expiration logic
  3. Link windows to bookings and threads
- **Acceptance Criteria:**
  - ✅ Windows created when booking assigned to sitter
  - ✅ Windows expire at booking end time
  - ✅ Thread routing checks window validity

**Epic 2.2: Routing Enforcement**
- **Goal:** Route messages based on assignment windows
- **Tasks:**
  1. Implement window-based routing in webhook handler
  2. Add assignment window validation to send endpoint
  3. Fallback to owner when window expired/not active
- **Acceptance Criteria:**
  - ✅ Messages outside windows route to owner
  - ✅ Sitters can only send during active windows
  - ✅ Owner receives all messages when no active window

---

### Phase 3: Anti-Poaching Enforcement (Epic 3)

**Epic 3.1: Content Detection**
- **Goal:** Detect poaching attempts in message content
- **Tasks:**
  1. Implement phone number regex detection
  2. Implement email/URL/social media detection
  3. Create content scanning middleware
- **Acceptance Criteria:**
  - ✅ Phone numbers detected in messages
  - ✅ External contact info detected
  - ✅ False positive rate < 5%

**Epic 3.2: Enforcement Actions**
- **Goal:** Block/flag poaching attempts
- **Tasks:**
  1. Create `AntiPoachingAttempt` model
  2. Implement blocking logic (prevent send or auto-delete)
  3. Implement warning message to sender
  4. Implement owner notification
- **Acceptance Criteria:**
  - ✅ Poaching attempts blocked
  - ✅ Sender receives friendly warning
  - ✅ Owner notified of attempt
  - ✅ Audit log created

---

### Phase 4: One-Time Client & Pool Management (Epic 4)

**Epic 4.1: Client Classification**
- **Goal:** Identify one-time vs. recurring clients
- **Tasks:**
  1. Implement client classification logic
  2. Add `isOneTimeClient` flag to threads
  3. Implement classification rules (booking count, recency)
- **Acceptance Criteria:**
  - ✅ Clients classified correctly
  - ✅ Classification updates automatically
  - ✅ Owner can override classification

**Epic 4.2: Pool Number Rotation**
- **Goal:** Manage rotating pool numbers for one-time clients
- **Tasks:**
  1. Implement pool number rotation algorithm
  2. Assign pool numbers to one-time client threads
  3. Implement rotation triggers (booking release, time-based)
- **Acceptance Criteria:**
  - ✅ Pool numbers rotate correctly
  - ✅ One-time clients use pool numbers
  - ✅ Rotation doesn't break existing conversations

**Epic 4.3: Post-Release Routing**
- **Goal:** Route post-release messages to owner with auto-response
- **Tasks:**
  1. Implement post-release detection
  2. Route messages to owner inbox
  3. Send auto-response ("This booking is complete...")
- **Acceptance Criteria:**
  - ✅ Post-release messages route to owner
  - ✅ Client receives auto-response
  - ✅ Owner notified of post-release contact

---

### Phase 5: Meet-and-Greet Workflows (Epic 5)

**Epic 5.1: Meet-and-Greet Thread Creation**
- **Goal:** Create meet-and-greet threads with Front Desk number
- **Tasks:**
  1. Add `isMeetAndGreet` flag to threads
  2. Implement meet-and-greet thread creation
  3. Start with Front Desk number
- **Acceptance Criteria:**
  - ✅ Meet-and-greet threads created correctly
  - ✅ Initial routing to Front Desk
  - ✅ Owner can approve transition

**Epic 5.2: Approval & Number Transition**
- **Goal:** Transition from Front Desk to Sitter number after approval
- **Tasks:**
  1. Implement approval workflow (owner action)
  2. Transition thread to sitter's masked number
  3. Update provider session participants
- **Acceptance Criteria:**
  - ✅ Approval triggers number transition
  - ✅ Client sees sitter's masked number
  - ✅ Conversation history preserved

---

### Phase 6: Sitter Lifecycle Integration (Epic 6)

**Epic 6.1: Onboarding Integration**
- **Goal:** Assign masked number on sitter onboarding
- **Tasks:**
  1. Hook into sitter onboarding workflow
  2. Trigger number assignment
  3. Create SitterMaskedNumber record
- **Acceptance Criteria:**
  - ✅ New sitters get masked numbers automatically
  - ✅ Numbers persist for sitter lifecycle
  - ✅ Provider participants created

**Epic 6.2: Offboarding Integration**
- **Goal:** Deactivate numbers and reassign clients on offboarding
- **Tasks:**
  1. Hook into sitter offboarding workflow
  2. Deactivate sitter's masked number
  3. Reassign active threads to owner or new sitter
  4. Create assignment audit records
- **Acceptance Criteria:**
  - ✅ Offboarding deactivates number immediately
  - ✅ Active threads reassigned
  - ✅ No message loss during transition

---

### Phase 7: Weekly Thread Persistence (Epic 7)

**Epic 7.1: Weekly Thread Scoping**
- **Goal:** Implement weekly thread persistence logic
- **Tasks:**
  1. Define weekly thread scope (calendar week? 7-day rolling?)
  2. Implement thread persistence rules
  3. Ensure threads persist across weeks
- **Acceptance Criteria:**
  - ✅ Threads persist for client lifetime
  - ✅ Weekly scoping doesn't break continuity
  - ✅ Historical threads accessible

**Epic 7.2: Thread Archive & Cleanup**
- **Goal:** Archive old threads while preserving audit trail
- **Tasks:**
  1. Implement thread archival logic
  2. Preserve audit records
  3. Maintain thread searchability
- **Acceptance Criteria:**
  - ✅ Old threads archived correctly
  - ✅ Audit trail preserved
  - ✅ No data loss

---

### Phase 8: Owner Visibility & Override (Epic 8)

**Epic 8.1: Visibility Dashboard**
- **Goal:** Owner sees all threads, messages, assignments
- **Tasks:**
  1. Enhance Messages UI with owner visibility
  2. Show all threads (not just assigned)
  3. Show assignment windows, number classes
- **Acceptance Criteria:**
  - ✅ Owner sees all client threads
  - ✅ Assignment windows visible
  - ✅ Number classes visible

**Epic 8.2: Override Authority**
- **Goal:** Owner can override assignments, unblock messages
- **Tasks:**
  1. Implement override UI
  2. Allow manual thread reassignment
  3. Allow unblocking anti-poaching attempts
- **Acceptance Criteria:**
  - ✅ Owner can reassign threads
  - ✅ Owner can unblock messages
  - ✅ Override actions audited

---

## 7. Schema Migration Script Requirements

### 7.1 Migration Script 1: Number Classification

```typescript
// Categorize existing MessageNumber records
- Identify Front Desk number (first number, or explicit flag)
- Mark remaining as "pool"
- Create SitterMaskedNumber records for existing sitter assignments
```

### 7.2 Migration Script 2: Thread Number Class Assignment

```typescript
// Backfill thread.numberClass
- If assignedSitterId exists → "sitter"
- If scope === "client_general" → "front_desk"
- If scope === "client_booking" → infer from booking assignment
- Default → "pool"
```

### 7.3 Migration Script 3: Assignment Window Backfill

```typescript
// Create AssignmentWindow records for existing active assignments
- For each thread with assignedSitterId
- Find associated booking
- Create window with booking start/end times
- Mark as active if booking is active
```

---

## 8. Testing Requirements

### 8.1 Unit Tests

- Number assignment logic (Front Desk, Sitter, Pool)
- Assignment window validation
- Anti-poaching detection patterns
- Client classification rules
- Pool number rotation algorithm

### 8.2 Integration Tests

- End-to-end routing: client → sitter → owner
- Assignment window expiration → owner routing
- Anti-poaching blocking → warning → owner notification
- Meet-and-greet transition workflow
- Sitter offboarding → thread reassignment

### 8.3 Acceptance Tests

- **Stable client visible number:** Client sees same number before/after reassignment
- **True masking:** No real numbers exposed
- **Assignment window enforcement:** Sitters can only message during active windows
- **Anti-poaching:** Poaching attempts blocked, owner notified
- **Meet-and-greet:** Smooth transition from Front Desk to Sitter number

---

## 9. Dependencies & Prerequisites

### 9.1 External Dependencies

- ✅ Twilio Proxy Service (already configured)
- ✅ Twilio phone numbers (Front Desk + Pool numbers)
- ⚠️ **NEW:** Additional phone numbers for pool rotation

### 9.2 Internal Dependencies

- ✅ Sitter onboarding/offboarding workflows (need integration points)
- ✅ Booking lifecycle management (for assignment windows)
- ⚠️ **NEW:** Client classification service
- ⚠️ **NEW:** Anti-poaching detection service

---

## 10. Risk Assessment

### High Risk

1. **Proxy Session Authentication Failure**
   - **Current State:** Failing with error 20003
   - **Impact:** Cannot create Proxy Sessions (blocking masking)
   - **Mitigation:** Fix Twilio credentials before Phase 1 deployment

2. **Backward Compatibility**
   - **Risk:** Existing threads may break if number class migration fails
   - **Mitigation:** Comprehensive migration testing, rollback plan

### Medium Risk

1. **Assignment Window Complexity**
   - **Risk:** Complex routing logic may have edge cases
   - **Mitigation:** Extensive testing, gradual rollout

2. **Anti-Poaching False Positives**
   - **Risk:** Legitimate messages blocked
   - **Mitigation:** Owner override, whitelist patterns

### Low Risk

1. **Weekly Thread Persistence**
   - **Risk:** Minimal - mostly UI/UX changes
   - **Mitigation:** Feature flag, gradual rollout

---

## 11. Canonical Clarifications (APPROVED)

### 11.1 Number Assignment Rules

**Front Desk Number is used for:**
- Booking inquiries and general questions
- Scheduling and changes that are not within an active booking window
- Billing and payment links
- Meet and greet coordination before approval
- Any message that arrives when no active assignment window exists

**Sitter Masked Number is used for:**
- All service communication during active assignment windows after the sitter is assigned to that client
- Weekly clients persist on sitter masked numbers for continuity, but sitter send is still gated by assignment windows
- Multiple sitters for the same weekly client is allowed. The client sees different sitter masked numbers per sitter. That is intended.

**Pool Numbers are used for:**
- One time bookings or overflow before a sitter is assigned
- Temporary coverage for short jobs where we do not want to commit a sitter identity number
- If a pool number is reused and an old client texts it later, it must never attach to the current client. It routes to owner with auto response.

**Sitter Offboarding:**
- Deactivate immediately. Do not reassign that sitter's masked number to a new sitter for at least 90 days. After cooldown, it may be recycled, but only as a pool number, never as another sitter identity number.
- **Reason:** avoids client confusion and prevents the "same number different sitter" trust break.

### 11.2 Assignment Windows

**Window Duration and Buffer:**
- AssignmentWindow equals the scheduled booking start and end, plus a buffer.
- **Default buffer policy:**
  - Drop in and walk: 60 minutes before start, 60 minutes after end
  - House sitting: start at check in time minus 2 hours, end at check out time plus 2 hours
- These buffers should be configurable per service type later, but hardcode defaults now.

**Multiple Active Bookings and Routing:**
- If there is exactly one active assignment window for that client at that moment, route to that sitter.
- If there are multiple active assignment windows overlapping at that moment, route to owner inbox by default, and show an owner UI prompt to choose the target sitter. This prevents wrong routing in complex overlaps.

### 11.3 One-Time Client Detection

**Classification Criteria:**
- We will not try to infer this purely from booking count yet.
- We store **`isOneTimeClient` only** in schema. Recurring is derived, not stored.
- **Derivation:** Recurring = explicit recurrence signal on booking or active weekly plan.
- **Default rule:** If client has an active weekly plan or explicit recurrence on booking, treat as recurring (`isOneTimeClient` false). Otherwise for new bookings, `isOneTimeClient` true unless owner marks it recurring.
- This keeps it deterministic and avoids silent misclassification.

**Post-Release Routing Window:**
- Always safe route.
- If a pool number receives an inbound from a sender who is not currently mapped to an active thread on that number, it must route to owner inbox and trigger an auto response.
- **Optional safety:**
  - Do not reassign a pool number to a different client within 30 days of release if you have enough pool capacity. This reduces stray "texting back later" confusion. If pool is tight, you can reuse immediately because the routing safeguard prevents leakage anyway.

### 11.4 Anti-Poaching Rules

**Detection Patterns:**
- **Must detect and block:**
  - Phone numbers in common formats
  - Emails
  - URLs
  - Social handles and keywords such as instagram, ig, snap, whatsapp, telegram, dm me, text me, call me
- **Implementation:**
  - Regex based detection first. Log every blocked attempt with message, thread, sender role, sitter id if applicable.

**False Positives Handling:**
- Blocked message never delivers by default.
- Owner can override and force send only from the owner dashboard with an explicit reason, logged.

**Enforcement Actions:**
- Always block and warn on first offense. Always flag to owner.
- Second offense by same sitter within 30 days triggers an owner alert marked high severity.
- Third offense triggers automatic sitter messaging lock pending owner review.

### 11.5 Meet-and-Greet Workflow

**Who Approves:**
- Owner only.

**Pending Approval Routing:**
- During meet and greet stage, create a MeetAndGreet thread that uses the front desk number by default.
- Owner can optionally allow the assigned sitter to message inside that meet and greet thread, but only during the meet and greet assignment window.
- After approval, messages move to sitter masked number for future service communication.
- If meet and greet fails, thread remains front desk only and sitter access is removed.

### 11.6 Billing Isolation

**Which Threads Qualify:**
- Billing is relationship thread only, owner visible only.
- **Rules:**
  - Payment links, invoices, billing reminders only originate from front desk number.
  - Sitters never see billing messages or billing automation events.
  - Job threads can contain service updates and scheduling within the active window only, no money.

---

## 12. Recommendation

**Proceed with Phased Implementation:**

1. **Phase 1** (Foundation): Number management - **CRITICAL** for all other phases
2. **Phase 2** (Enforcement): Assignment windows - **REQUIRED** for routing
3. **Phase 3** (Security): Anti-poaching - **HIGH PRIORITY** for trust
4. **Phase 4-8** (Enhancements): Can proceed in parallel after Phase 1-2

**Blockers:**
- Fix Proxy Session authentication (error 20003) before Phase 1
- Clarify ambiguous areas before starting implementation
- Secure additional phone numbers for pool rotation

---

## Next Steps

1. ✅ Review this analysis document
2. ✅ Canonical clarifications approved (Section 11)
3. ✅ Twilio Proxy smoke test script created
4. ⏳ **RUN SMOKE TEST:** `npx tsx scripts/twilio-proxy-smoke.ts`
5. ⏳ Fix Proxy Session authentication (error 20003) if smoke test fails
6. ⏳ Begin Phase 1 implementation (after smoke test passes)

---

**Document Status:** Approved - Ready for Implementation  
**Implementation Status:** Blocked until smoke test passes  
**Implementation Scope:** Phase 1 through Phase 3 only
