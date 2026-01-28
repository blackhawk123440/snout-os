# Enterprise Messaging Dashboard Specification

**Version:** 1.0  
**Date:** 2026-01-19  
**Status:** Canonical Product Specification

---

## Executive Summary

This document defines the complete product specification for the SnoutOS Enterprise Messaging Dashboard—a unified control center that enables non-technical operators to manage the entire messaging infrastructure through a visual interface. The dashboard transforms complex messaging operations into plug-and-play workflows, eliminating the need for scripts, terminals, or technical knowledge.

**Key Design Principles:**
- **Human-first UX**: Every action is discoverable, every state is visible, every consequence is clear
- **Trust preservation**: Operators can see why things happen, override when needed, and audit everything
- **Safety by default**: Irreversible actions require confirmation, dangerous operations are gated, defaults prevent errors
- **Deterministic behavior**: Same inputs always produce same outputs; no hidden magic or unpredictable routing
- **Zero hidden magic**: All routing logic is visible, all automations are inspectable, all numbers are traceable
- **Observable systems**: Every message, every routing decision, every automation execution is logged and searchable
- **Twilio abstraction layer**: The dashboard fully replaces Twilio for all normal operations; operators never need to log into Twilio
- **Masking invisibility**: Masking behavior is implicit and automatic; operators never configure masking manually

---

## Table of Contents

1. [Product Principles](#1-product-principles)
2. [User Roles and Permissions](#2-user-roles-and-permissions)
3. [Dashboard Control Surfaces](#3-dashboard-control-surfaces)
4. [Core Operational Workflows](#4-core-operational-workflows)
5. [UX Standards and Safety Rules](#5-ux-standards-and-safety-rules)
6. [Scalability and Enterprise Readiness](#6-scalability-and-enterprise-readiness)

**Note:** Section 3 includes 9 control surfaces (Number Inventory, Routing Control, Assignments, Messaging Inbox, Audit & Compliance, Automations, Alerts & Escalation, Provider & System Settings, and Messaging Setup Wizard).

---

## 1. Product Principles

### 1.1 Human-First UX

**Principle:** The dashboard must be usable by someone who has never seen code, never used a terminal, and never configured a messaging system.

**Implementation:**
- All technical concepts are translated into human language
- Routing rules are shown as "If this, then that" statements, not code
- Number classes are labeled as "Front Desk", "Sitter", "Pool"—not technical identifiers
- Error messages explain what happened and what the operator should do
- Every action has a clear, visible outcome

**Example:** Instead of "Number class mismatch: MessageNumber has 'sitter', expected 'pool'", show "This number is assigned to a sitter, but this thread needs a pool number. Would you like to assign a different number?"

### 1.2 Trust Preservation

**Principle:** Operators must trust the system. Trust comes from transparency, predictability, and control.

**Implementation:**
- Every routing decision shows its reasoning
- Every blocked message explains why it was blocked
- Every automation execution is logged and visible
- Operators can override routing temporarily (owner-only)
- All changes are audited with timestamps and actor information
- System state is always visible—no hidden queues or silent failures

**Example:** When a message is routed to the owner inbox instead of a sitter, the dashboard shows: "Routed to Owner Inbox because: No active assignment window at 2:30 PM on Jan 19. Sitter assignment window starts at 3:00 PM."

### 1.3 Safety by Default

**Principle:** The system prevents errors before they happen. Dangerous operations are gated, irreversible actions require confirmation, and defaults are safe.

**Implementation:**
- Number reassignment requires confirmation if threads are active
- Quarantine actions show impact preview before execution
- Automation changes require "test mode" before going live
- Pool number reuse shows cooldown status and prevents premature reuse
- Sitter offboarding shows all affected threads before deactivation
- Delivery failure retries are limited and require manual approval after threshold

**Example:** Before quarantining a number, the dashboard shows: "This will affect 3 active threads. Messages will be routed to owner inbox until reassignment. Continue?"

### 1.4 Deterministic Behavior

**Principle:** Same inputs always produce same outputs. No randomness, no hidden state, no time-dependent behavior that surprises operators.

**Implementation:**
- Routing rules are evaluated in a fixed order
- Number assignment follows deterministic priority (active > available > pool)
- Assignment windows are evaluated at exact timestamps
- Pool number selection uses deterministic rotation (not random)
- All system state is queryable—no ephemeral state

**Example:** If a message arrives at 2:30 PM and an assignment window starts at 3:00 PM, the message always routes to owner inbox. This is consistent every time.

### 1.5 Zero Hidden Magic

**Principle:** Operators must be able to see and understand every decision the system makes. No black boxes, no "it just works" explanations.

**Implementation:**
- Routing simulator shows exact evaluation path
- Automation execution logs show condition evaluation results
- Number assignment shows why a specific number was chosen
- Policy violations show detected patterns and matched rules
- Delivery failures show provider error codes and retry attempts
- All system logic is inspectable through the UI

**Example:** The routing simulator shows: "Step 1: Thread has assigned sitter → Check assignment window. Step 2: Window active from 3:00 PM to 6:00 PM → Current time 2:30 PM → Window not active. Step 3: Route to owner inbox."

### 1.6 Observable Systems

**Principle:** Every action, every decision, every state change is logged and searchable. Operators can reconstruct what happened and why.

**Implementation:**
- Unified audit timeline per thread shows all events
- Message delivery status is tracked end-to-end
- Automation executions are logged with inputs and outputs
- Number state changes are tracked with timestamps
- Routing decisions are logged with reasoning
- Policy violations are logged with detection details
- All logs are searchable by time, actor, thread, number, or event type

**Example:** The audit timeline shows: "2026-01-19 14:30:15 - Message received from +1234567890. 2026-01-19 14:30:16 - Routing evaluated: No active window → Routed to owner inbox. 2026-01-19 14:30:17 - Owner notified via inbox."

### 1.7 Twilio Abstraction Layer

**Principle:** The dashboard must completely abstract the Twilio interface. Operators should never need to log into Twilio for normal operations.

**Implementation:**
- **Credential Onboarding**: Guided wizard for connecting Twilio credentials (Account SID, Auth Token)
- **Automatic Webhook Installation**: System automatically configures webhooks and callbacks in Twilio
- **Number Provisioning**: Buy and import numbers directly from dashboard (no Twilio console access)
- **Health Monitoring**: Provider status, connection health, and error surfacing within dashboard
- **Error Surfacing**: All Twilio errors are translated into human-readable messages with actionable steps
- **Safe Defaults**: System provides safe defaults for all provider settings
- **Complete Coverage**: Every operation that would normally require Twilio access is supported in the dashboard

**What Operators Never See:**
- Twilio console interface
- Webhook configuration URLs (handled automatically)
- SIP configuration
- Carrier restrictions (handled by system)
- Phone SID formats (abstracted to E164)
- Callback URLs (managed automatically)

**What Operators Do See:**
- "Connect Provider" button in setup wizard
- Number inventory with purchase/import options
- Provider health status and connection status
- Error messages like "Unable to send message. Check provider connection."
- System readiness indicators

**Example:** Instead of "Configure webhook at https://api.twilio.com/...", operators see "Setup complete. System is ready to receive messages."

**Rationale:** Twilio becomes an implementation detail, not a user-facing dependency. Operators focus on business operations, not telecom infrastructure.

### 1.8 Masking Must Be Invisible

**Principle:** Operators should never configure masking manually. Masking behavior is implicit and enforced by system routing rules.

**Implementation:**
- **Automatic Number Selection**: System automatically selects the correct number based on routing rules (Front Desk, Sitter, Pool)
- **No Manual Configuration**: Operators never set up "forwarding," "proxy sessions," or telecom concepts
- **Real Numbers Hidden**: Real client phone numbers are never exposed to sitters or clients
- **Business Language**: All masking is described in business terms ("Messages go to the right people from the right business number")
- **Implicit Behavior**: Masking happens automatically when:
  - Sitter is assigned to client → Sitter masked number used
  - One-time booking created → Pool number used
  - General inquiry → Front Desk number used

**What Operators Never See:**
- "Configure masking" settings
- "Forward messages to" options
- "Proxy session" configuration
- Real client phone numbers in sitter view
- Real sitter phone numbers in client view
- Webhook forwarding rules

**What Operators Do See:**
- "Assign sitter to client" → System handles masking automatically
- "Thread uses [Number Class] number" → Business-friendly label
- "Messages sent from business number" → Clear, simple explanation

**Example:** When assigning a sitter to a client, operators see "Sitter [Name] will communicate with [Client] using business number [E164]." They never see "Configure Twilio Proxy session with participants..."

**Rationale:** Masking is a technical implementation detail. Operators should think in business terms: "Messages just go to the right people from the right business number."

---

## 2. User Roles and Permissions

### 2.1 Owner

**Definition:** The business owner or primary operator who has full control over the messaging infrastructure.

**What Owners Can See:**
- All numbers (Front Desk, Sitter, Pool) with full details
- All threads across all clients and sitters
- All routing rules and their evaluation results
- All assignment windows and their status
- All automations and their execution logs
- All policy violations and delivery failures
- All audit logs and system events
- Provider settings and integration status
- System health metrics and alerts

**What Owners Can Do:**
- Buy new numbers directly from provider
- Assign numbers to sitters or release to pool
- Quarantine numbers and manage cooldown periods
- Override routing temporarily (emergency override)
- View and edit all routing rules
- Create, edit, enable/disable automations
- Review and resolve policy violations
- Retry failed message deliveries
- Assign sitters to clients
- Create and modify assignment windows
- View unified inbox (all threads)
- Export audit logs and reports
- Configure provider settings
- Manage system-wide settings

**Restrictions:**
- Cannot permanently delete audit logs (archived only)
- Cannot disable critical safety guardrails (cooldown periods, anti-poaching checks)
- Cannot modify system-level routing logic (only override temporarily)

### 2.2 Admin (Future Role)

**Definition:** Secondary operators with delegated permissions. Not yet implemented, reserved for future expansion.

**Planned Capabilities:**
- Limited number management (assign, release, but not purchase)
- View-only access to sensitive settings
- Thread management within assigned scope
- Automation management with approval workflow
- Policy violation review (but not resolution)

### 2.3 Sitter

**Definition:** Service providers who communicate with clients through assigned masked numbers.

**What Sitters Can See:**
- Only threads assigned to them during active assignment windows
- Only their own masked number (not the real client number)
- Messages in assigned threads only
- Their own message history
- Assignment window status for their bookings

**What Sitters Can Do:**
- Send messages to clients in assigned threads
- Receive messages from clients in assigned threads
- View thread history for their assignments
- See assignment window start/end times

**Restrictions:**
- Cannot see client real phone numbers
- Cannot see threads not assigned to them
- Cannot see other sitters' threads
- Cannot see owner inbox or system messages
- Cannot modify routing or number assignments
- Cannot see automations or system settings
- Messages are blocked if sent outside assignment windows
- Messages are blocked if they contain anti-poaching violations

### 2.4 Automation

**Definition:** System processes that send messages automatically based on triggers and conditions.

**What Automations Can See:**
- Event triggers (booking created, status changed, etc.)
- Condition evaluation context (booking, client, sitter data)
- Template variables and their resolved values

**What Automations Can Do:**
- Send SMS messages via provider
- Send emails (future)
- Create internal tasks
- Update booking status
- Trigger other automations (future)

**Restrictions:**
- Cannot override routing rules
- Cannot bypass anti-poaching checks
- Cannot send to numbers not assigned to threads
- Must respect automation enable/disable flags
- Must log all execution attempts

---

## 3. Dashboard Control Surfaces

### 3.1 Number Inventory

**Purpose:** Manage all phone numbers as managed assets—treat numbers as first-class inventory with full lifecycle tracking, assignment controls, health monitoring, and bulk operations.

**Core Concept:** Numbers are treated as managed assets with complete visibility and control. This eliminates hidden complexity and operational uncertainty. Operators can see exactly what each number is doing, where it's assigned, and its health status at all times.

**What the User Sees:**

**Main Table View:**
- **Number (E164)**: Display format: `+1 (555) 123-4567`
- **Class**: Badge showing "Front Desk", "Sitter", or "Pool"
- **Status**: Badge showing "Active", "Quarantined", or "Inactive"
- **Assigned To**: 
  - Front Desk: "Front Desk" (static)
  - Sitter: Sitter name with link to profile
  - Pool: "Pool" or "Unassigned"
- **Health Status**: 
  - Green: No delivery errors in last 7 days
  - Yellow: 1-2 delivery errors in last 7 days
  - Red: 3+ delivery errors in last 7 days
- **Last Usage**: Date/time of last message sent/received
- **Message Volume (7d)**: Count of messages in last 7 days
- **Actions**: Quick actions menu (Assign, Release, Quarantine, View Details)

**Filters:**
- **By Class**: Front Desk / Sitter / Pool (multi-select)
- **By Status**: Active / Quarantined / Inactive (multi-select)
- **By Assignment**: 
  - Assigned to sitter: Dropdown to select sitter
  - Assigned to client: Search by client name
  - Unassigned: Show pool numbers
- **By Health**: All / Healthy / Warning / Critical
- **By Usage**: 
  - Recently used (last 24h, 7d, 30d)
  - Never used
  - High volume (>100 messages/7d)

**Detail View (Modal or Side Panel):**
- Full number details
- Assignment history (timeline of assignments)
- Current thread assignments (list of active threads using this number)
- Delivery error history (last 30 days)
- Cooldown status (if quarantined, shows days remaining)
- Provider information (Twilio SID, capabilities)
- Purchase date and cost (if available)

**Primary Actions:**

1. **Buy New Number**
   - Button: "Buy New Number"
   - Opens provider purchase flow
   - Select number class (Front Desk, Sitter, Pool)
   - Select area code or search by location
   - Preview cost before purchase
   - After purchase, number appears in inventory

2. **Assign Number to Sitter**
   - Select number(s) → "Assign to Sitter"
   - Search/select sitter
   - Preview: Shows current assignment (if any) and impact
   - Confirmation: "Assign [number] to [sitter]? This will deactivate current assignment if exists."
   - After assignment: Number status updates, sitter receives notification

3. **Release Number to Pool**
   - Select number(s) → "Release to Pool"
   - Only available for sitter-assigned numbers
   - Preview: Shows active threads that will be affected
   - Confirmation: "Release [number] to pool? [X] active threads will be reassigned to pool numbers."
   - After release: Number moves to pool, threads reassigned

4. **Quarantine Number**
   - Select number(s) → "Quarantine"
   - Reason dropdown: "Delivery failures", "Policy violation", "Manual review", "Other"
   - Preview: Shows active threads and impact
   - Confirmation: "Quarantine [number]? This will: [list of impacts]. Number will be unavailable for [90] days."
   - After quarantine: Number status changes, threads reassigned, cooldown timer starts

5. **Reassign After Cooldown**
   - Available for quarantined numbers after cooldown period (90 days)
   - Button: "Release from Quarantine"
   - Preview: Shows cooldown completion date
   - Confirmation: "Release [number] from quarantine? It will be available for pool assignment."
   - After release: Number moves to pool, available for assignment

**Guardrails and Safety Rules:**
- Cannot quarantine Front Desk number (must have at least one)
- Cannot release Front Desk number to pool
- Quarantine requires reason and shows impact preview
- Number reassignment shows active thread count
- Cooldown period cannot be bypassed (90 days enforced)
- Delivery error threshold: 3+ errors in 7 days triggers health warning

**Error and Failure States:**
- **Provider Purchase Failure**: Show error message, retry button, contact support link
- **Assignment Conflict**: "Number is already assigned to [sitter]. Release first?"
- **Quarantine Blocked**: "Cannot quarantine: Number is Front Desk number. Assign replacement first."
- **Cooldown Not Complete**: "Number is in cooldown until [date]. [X] days remaining."

**Bulk Operations:**
- **Bulk Assign**: Select multiple numbers → Assign to sitter(s) in batch
- **Bulk Release**: Select multiple sitter numbers → Release to pool
- **Bulk Quarantine**: Select multiple numbers → Quarantine with same reason
- **Bulk Import**: Import existing Twilio numbers (by SID or E164)
- **Bulk Export**: Export number inventory to CSV (for reporting)

**Number Lifecycle Tracking:**
- **Purchase/Import Date**: When number was added to system
- **First Assignment Date**: When number was first assigned
- **Last Assignment Date**: When number was last assigned
- **Quarantine History**: Timeline of quarantine events
- **Assignment Count**: How many times number has been assigned
- **Thread Count**: Current number of active threads using this number

**Permissions:**
- Owner: Full access (view, assign, release, quarantine, purchase, bulk operations)
- Admin (future): Limited access (view, assign, release; no purchase, no quarantine, no bulk operations)
- Sitter: No access (cannot see number inventory)

---

### 3.2 Routing Control & Simulator

**Purpose:** View all routing rules in human language, preview routing decisions, and override routing temporarily (owner-only).

**What the User Sees:**

**Routing Rules Table:**
- **Rule Name**: Human-readable name (e.g., "Sitter Assignment Window Routing")
- **Priority**: Order of evaluation (1 = highest)
- **Description**: Human language explanation (e.g., "If thread has assigned sitter and assignment window is active, route to sitter")
- **Status**: Active / Inactive
- **Last Evaluated**: Timestamp of last evaluation
- **Evaluation Count (24h)**: How many times rule was evaluated in last 24 hours

**Routing Simulator:**
- **Input Section**:
  - Thread selector: Search/select thread
  - Client selector: Search/select client (creates preview thread)
  - Time selector: Pick date/time (default: now)
  - Number selector: Pick number (for outbound routing)
- **Preview Section**:
  - Shows step-by-step evaluation:
    - Step 1: "Check thread assignment → Has sitter: [Name]"
    - Step 2: "Check assignment window → Window active: Yes (3:00 PM - 6:00 PM)"
    - Step 3: "Evaluate routing → Route to: Sitter ([Name])"
  - Final result: "Message would route to: [Target]"
  - Reasoning: "Because: [Human explanation]"
- **Override Section** (Owner-only):
  - Toggle: "Override routing temporarily"
  - Target selector: "Route to: Owner Inbox / Sitter / Client"
  - Duration: "Override for: 1 hour / 4 hours / 24 hours / Until manually removed"
  - Reason: Text field (required)
  - Preview: Shows what will happen
  - Confirmation: "Override routing for [thread]? Messages will route to [target] for [duration]."

**Routing History:**
- Timeline view of routing decisions for selected thread
- Shows: Timestamp, Rule evaluated, Result, Override status (if any)
- Filterable by date range, rule, result

**Primary Actions:**

1. **Preview Routing**
   - Select thread/client, time, number
   - Click "Preview Routing"
   - System evaluates routing rules and shows step-by-step result
   - No changes made to system

2. **Override Routing** (Owner-only)
   - Select thread
   - Enable override toggle
   - Select target and duration
   - Enter reason
   - Confirm override
   - Override appears in routing history with owner badge

3. **Remove Override** (Owner-only)
   - Find active override in routing history
   - Click "Remove Override"
   - Confirmation: "Remove routing override? Messages will route normally."
   - After removal: Routing returns to normal rules

4. **View Routing History**
   - Select thread
   - View timeline of routing decisions
   - Filter by date range, rule, result
   - Export to CSV (future)

**Guardrails and Safety Rules:**
- Overrides are temporary only (cannot be permanent)
- Overrides require reason (audit trail)
- Overrides expire automatically after duration
- Overrides are visible in routing history with owner badge
- Overrides do not affect assignment windows (only routing target)
- Simulator is read-only (does not change system state)

**Error and Failure States:**
- **Thread Not Found**: "Thread not found. Create thread first?"
- **No Routing Rule Matched**: "No routing rule matched. Default: Route to owner inbox."
- **Override Conflict**: "Override already exists. Remove existing override first?"
- **Override Expired**: "Override expired. Routing returned to normal rules."

**Permissions:**
- Owner: Full access (view rules, simulate, override, remove override)
- Admin (future): View-only access (view rules, simulate; no override)
- Sitter: No access (cannot see routing control)

---

### 3.3 Assignments & Windows

**Purpose:** Manage sitter-to-client assignments and assignment windows visually. View assignment windows, create assignments, trigger reassignment messages.

**What the User Sees:**

**Assignment Windows Calendar View:**
- Calendar grid showing assignment windows
- Color coding:
  - Green: Active window (current time within window)
  - Blue: Future window (starts in future)
  - Gray: Past window (ended)
  - Red: Overlapping windows (conflict)
- Click window to see details

**Assignment Windows List View:**
- **Thread**: Client name, thread link
- **Sitter**: Sitter name, link to profile
- **Start Time**: Date/time window starts
- **End Time**: Date/time window ends
- **Status**: Active / Future / Past / Overlapping
- **Booking**: Booking link (if applicable)
- **Actions**: Edit, Delete, View Details

**Sitter Assignment Panel:**
- **Sitter Selector**: Search/select sitter
- **Client Selector**: Search/select client
- **Assignment Type**: 
  - "Weekly Client" (recurring assignment)
  - "One-Time Booking" (single booking assignment)
  - "Meet and Greet" (temporary assignment)
- **Time Range**: Start date/time, end date/time
- **Preview**: Shows what will happen (number assignment, window creation, message sending)

**Assignment Conflicts View:**
- List of overlapping assignment windows
- Shows: Thread, Sitter 1, Sitter 2, Overlap period
- Actions: Resolve conflict (assign to one sitter, split window, etc.)

**Primary Actions:**

1. **Assign Sitter to Client**
   - Select sitter and client
   - Select assignment type
   - Set time range
   - Preview shows:
     - Assignment window will be created
     - Number will be assigned (sitter masked number)
     - Reassignment message will be sent (if applicable)
   - Confirmation: "Assign [sitter] to [client] from [start] to [end]?"
   - After assignment:
     - Assignment window created
     - Number assigned to thread
     - Reassignment message sent (if client was previously assigned)
     - Sitter notified

2. **Create Assignment Window**
   - Manual window creation (for edge cases)
   - Select thread, sitter, start/end time
   - Preview shows impact
   - Confirmation: "Create assignment window?"
   - After creation: Window appears in calendar and list

3. **Edit Assignment Window**
   - Select window
   - Modify start/end time
   - Preview shows impact (routing changes, thread reassignment)
   - Confirmation: "Update assignment window? This may affect message routing."
   - After update: Window updated, routing re-evaluated if needed

4. **Delete Assignment Window**
   - Select window
   - Preview shows impact
   - Confirmation: "Delete assignment window? Messages will route to owner inbox during this period."
   - After deletion: Window removed, routing updated

5. **Trigger Reassignment Message**
   - Select thread
   - Button: "Send Reassignment Message"
   - Preview: Shows message template
   - Confirmation: "Send reassignment message to [client]?"
   - After send: Message sent, logged in thread

6. **Override Window Rules** (Owner-only)
   - Temporary override for assignment windows
   - Select thread
   - Toggle: "Override window rules"
   - Set override period
   - Reason: Text field
   - Confirmation: "Override assignment window rules?"
   - After override: Messages route to specified target regardless of window

**Guardrails and Safety Rules:**
- Cannot create overlapping windows for same thread (shows conflict warning)
- Assignment window must have valid start/end times
- Cannot delete active window without confirmation
- Reassignment messages are sent automatically when sitter changes
- Window rules cannot be permanently disabled (only temporarily overridden)

**Error and Failure States:**
- **Overlapping Windows**: "Cannot create window: Overlaps with existing window. Resolve conflict first?"
- **Invalid Time Range**: "End time must be after start time."
- **Sitter Not Active**: "Sitter is inactive. Activate sitter first?"
- **Thread Not Found**: "Thread not found. Create thread first?"

**Permissions:**
- Owner: Full access (create, edit, delete windows, assign sitters, override)
- Admin (future): Limited access (create, edit windows; no override)
- Sitter: View-only access (see own assignment windows only)

---

### 3.4 Messaging Inbox

**Purpose:** Unified inbox for owners to view all messages across all threads. Filter, search, respond, and manage conversations.

**What the User Sees:**

**Inbox View:**
- **Thread List** (Left Panel):
  - Thread preview cards showing:
    - Client name
    - Last message preview
    - Last message time
    - Unread count badge
    - Assignment status (Assigned to [Sitter] / Unassigned)
    - Number class badge (Front Desk / Sitter / Pool)
  - Sortable by: Recent activity, Unread first, Client name, Assignment status
  - Filterable by: Assignment status, Number class, Unread, Date range

**Thread View** (Right Panel):
- **Thread Header**:
  - Client name and contact info
  - Assigned sitter (if any)
  - Assignment window status
  - Number class and E164
  - Thread metadata (created, last activity)
- **Message List**:
  - Chronological message timeline
  - Each message shows:
    - Sender (Client / Sitter / Owner / System)
    - Timestamp
    - Message body
    - Delivery status (Sent / Delivered / Failed)
    - Media attachments (if any)
    - Policy violation badge (if blocked)
    - Routing decision badge (if routed differently)
- **Compose Area**:
  - Message input
  - Send button
  - Attach media (future)
  - Override routing toggle (owner-only)

**Filters and Search:**
- **Quick Filters**:
  - Unread only
  - Assigned threads
  - Unassigned threads
  - Policy violations
  - Delivery failures
- **Advanced Search**:
  - Search by client name
  - Search by message content
  - Search by sitter name
  - Search by number
  - Date range filter

**Primary Actions:**

1. **View Thread**
   - Click thread in list
   - Thread opens in right panel
   - Messages load chronologically
   - Unread count updates

2. **Send Message** (Owner)
   - Select thread
   - Type message
   - Click "Send"
   - Message appears in thread
   - Delivery status updates in real-time

3. **Assign Sitter**
   - Select thread
   - Click "Assign Sitter"
   - Search/select sitter
   - Preview shows impact
   - Confirmation: "Assign [sitter] to [client]?"
   - After assignment: Thread updates, number reassigned, window created

4. **View Routing Decision**
   - Click routing badge on message
   - Shows: Why message was routed to current target
   - Shows: Assignment window status at message time
   - Shows: Override status (if any)

5. **Retry Failed Delivery**
   - Click failed message
   - Button: "Retry Delivery"
   - Preview: Shows failure reason
   - Confirmation: "Retry sending message?"
   - After retry: Message re-sent, status updated

6. **View Policy Violation**
   - Click policy violation badge
   - Shows: Violation type, detected content, reason
   - Shows: Blocking decision
   - Owner can: Review, approve (override), or dismiss

**Guardrails and Safety Rules:**
- Messages are blocked if they contain anti-poaching violations
- Owner can override blocking (with reason logged)
- Delivery retries are limited (max 3 automatic retries)
- Thread assignment requires valid sitter and time range
- Unread counts update in real-time

**Error and Failure States:**
- **Message Send Failed**: Show error message, retry button, failure reason
- **Thread Not Found**: "Thread not found. Create thread first?"
- **Delivery Failure**: Show provider error code, retry option, contact support link
- **Policy Violation**: Show violation details, override option (owner-only)

**Permissions:**
- Owner: Full access (view all threads, send messages, assign sitters, override)
- Admin (future): Limited access (view assigned threads, send messages; no override)
- Sitter: View-only access (own assigned threads only)

---

### 3.5 Audit & Compliance

**Purpose:** View complete audit trail of all system events, policy violations, delivery failures, and compliance data.

**What the User Sees:**

**Audit Timeline View:**
- Chronological timeline of all events
- Filterable by:
  - Event type (Message, Routing, Assignment, Number, Automation, Policy)
  - Actor (Owner, Sitter, Client, System, Automation)
  - Thread
  - Number
  - Date range
- Each event shows:
  - Timestamp
  - Event type badge
  - Actor (who/what performed action)
  - Description (human-readable)
  - Details (expandable JSON)
  - Related entities (thread, number, booking links)

**Policy Violations Feed:**
- List of all policy violations (anti-poaching, content policy, etc.)
- Each violation shows:
  - Timestamp
  - Thread and client
  - Violation type
  - Detected content (redacted for privacy)
  - Action taken (Blocked / Warned / Overridden)
  - Actor (who sent message)
  - Status (Open / Resolved / Dismissed)
- Actions: Review, Resolve, Dismiss, Export

**Delivery Failures Feed:**
- List of all failed message deliveries
- Each failure shows:
  - Timestamp
  - Thread and recipient
  - Failure reason (provider error code)
  - Retry attempts
  - Status (Failed / Retrying / Resolved)
- Actions: Retry, Mark Resolved, Export

**Response Time Analytics:**
- Charts showing:
  - Average response time by thread
  - Response time by sitter
  - Response time trends over time
  - SLA compliance (response within X minutes)
- Filterable by date range, sitter, thread

**Message Volume Metrics:**
- Charts showing:
  - Messages per day/week/month
  - Messages by number class
  - Messages by thread
  - Peak usage times
- Exportable to CSV

**Primary Actions:**

1. **View Audit Timeline**
   - Select filters (event type, actor, date range)
   - Timeline loads
   - Click event to see details
   - Export to CSV

2. **Review Policy Violation**
   - Click violation in feed
   - View details (violation type, content, action)
   - Actions: Resolve, Dismiss, Override (owner-only)

3. **Retry Delivery Failure**
   - Click failure in feed
   - View failure reason
   - Click "Retry"
   - Confirmation: "Retry sending message?"
   - After retry: Status updates

4. **Export Audit Log**
   - Select date range and filters
   - Click "Export to CSV"
   - File downloads with all audit events

5. **View Response Time Analytics**
   - Select date range
   - Charts update
   - Filter by sitter, thread
   - Export data

**Guardrails and Safety Rules:**
- Audit logs cannot be deleted (archived only)
- Policy violations require resolution or dismissal
- Delivery failures show retry limit (max 3 automatic)
- Export limits: Max 10,000 events per export

**Error and Failure States:**
- **Export Too Large**: "Export exceeds 10,000 events. Narrow date range or filters."
- **No Events Found**: "No events match filters. Adjust filters and try again."

**Permissions:**
- Owner: Full access (view all audits, export, resolve violations)
- Admin (future): View-only access (view audits, export; no resolution)
- Sitter: No access (cannot see audit logs)

---

### 3.6 Automations

**Purpose:** View, create, edit, enable/disable automations. Preview templates, see execution logs, audit automation sends.

**What the User Sees:**

**Automations List View:**
- **Automation Name**: Human-readable name
- **Lane**: Badge showing "Front Desk", "Sitter", "Billing", "System"
- **Status**: Badge showing "Active", "Paused", "Draft", "Archived"
- **Trigger**: Human-readable trigger description
- **Last Executed**: Timestamp of last execution
- **Execution Count (24h)**: How many times executed in last 24 hours
- **Actions**: Edit, Enable/Disable, View Logs, Delete

**Automation Detail View:**
- **Overview**:
  - Name, description, status
  - Lane, scope (global, org, sitter, client)
  - Created/updated timestamps
- **Trigger**:
  - Trigger type (e.g., "Booking Created")
  - Trigger configuration
- **Conditions**:
  - Condition groups (AND/OR logic)
  - Each condition shown in human language
- **Actions**:
  - List of actions in execution order
  - Each action shows type and configuration
- **Templates**:
  - Message templates (SMS, email)
  - Preview with sample variables
  - Template variables list
- **Execution Logs**:
  - Timeline of automation executions
  - Each execution shows:
    - Timestamp
    - Status (Success / Failed / Skipped)
    - Trigger context
    - Condition evaluation results
    - Actions executed
    - Error messages (if failed)

**Automation Builder** (Create/Edit):
- **Step 1: Basic Info**
  - Name, description, lane
  - Status (Draft / Active)
- **Step 2: Trigger**
  - Select trigger type
  - Configure trigger settings
- **Step 3: Conditions**
  - Add condition groups
  - Add conditions to groups
  - Configure AND/OR logic
- **Step 4: Actions**
  - Add actions
  - Configure action settings
  - Set execution order
- **Step 5: Templates**
  - Create/edit message templates
  - Preview with variables
  - Test template rendering
- **Step 6: Review**
  - Preview automation
  - Test mode (simulate execution)
  - Save or activate

**Primary Actions:**

1. **Create Automation**
   - Click "Create Automation"
   - Follow builder steps
   - Test in test mode
   - Save as draft or activate

2. **Edit Automation**
   - Select automation
   - Click "Edit"
   - Modify settings
   - Test changes
   - Save or activate

3. **Enable/Disable Automation**
   - Toggle switch on automation card
   - Confirmation: "Enable/Disable [automation name]?"
   - After toggle: Status updates, automation starts/stops executing

4. **Preview Template**
   - Select automation
   - Click "Preview Template"
   - Enter sample variables
   - Preview rendered message
   - See which number it sends from

5. **View Execution Logs**
   - Select automation
   - Click "View Logs"
   - Timeline of executions loads
   - Filter by status, date range
   - Click execution to see details

6. **Test Automation**
   - Select automation
   - Click "Test"
   - Select test context (booking, client, etc.)
   - Run test
   - See simulation results (no actual messages sent)

7. **Delete Automation**
   - Select automation
   - Click "Delete"
   - Confirmation: "Delete [automation name]? This cannot be undone."
   - After deletion: Automation archived (not permanently deleted)

**Guardrails and Safety Rules:**
- Automations cannot be deleted (archived only)
- Test mode never sends actual messages
- Template variables must be validated before activation
- Automation changes require test mode before going live
- Disabled automations do not execute (even if triggered)

**Error and Failure States:**
- **Invalid Template Variables**: "Template uses undefined variables: [list]. Define variables first."
- **Test Mode Required**: "Test automation before activating. Click 'Test' to simulate."
- **Trigger Not Configured**: "Trigger is required. Configure trigger in Step 2."
- **No Actions Defined**: "At least one action is required. Add actions in Step 4."

**Permissions:**
- Owner: Full access (create, edit, enable/disable, delete, view logs)
- Admin (future): Limited access (view, enable/disable; no create/edit)
- Sitter: No access (cannot see automations)

---

### 3.7 Alerts & Escalation

**Purpose:** View system alerts, escalation events, and critical issues that require operator attention.

**What the User Sees:**

**Alerts Dashboard:**
- **Critical Alerts** (Red):
  - Delivery failures exceeding threshold
  - Policy violations requiring review
  - Number health issues
  - System errors
- **Warnings** (Yellow):
  - Assignment window conflicts
  - Automation execution failures
  - Response time SLA breaches
  - Number cooldown expiring soon
- **Info** (Blue):
  - New thread created
  - Assignment window starting soon
  - Automation executed successfully
  - Number assigned/released

**Alert Cards:**
- Each alert shows:
  - Severity badge
  - Title
  - Description
  - Timestamp
  - Related entities (thread, number, automation links)
  - Actions (Resolve, Dismiss, View Details)

**Escalation Rules:**
- List of escalation rules
- Each rule shows:
  - Trigger condition
  - Escalation target (Owner, Admin, etc.)
  - Action taken
  - Status (Active / Inactive)

**Primary Actions:**

1. **View Alert**
   - Click alert card
   - Alert details open
   - Related entities shown
   - Actions available

2. **Resolve Alert**
   - Click "Resolve"
   - Confirmation: "Mark alert as resolved?"
   - After resolution: Alert moves to resolved list

3. **Dismiss Alert**
   - Click "Dismiss"
   - Confirmation: "Dismiss alert? It will be archived."
   - After dismissal: Alert archived

4. **View Escalation History**
   - Click "Escalation History"
   - Timeline of escalations
   - Filter by date range, type

5. **Configure Escalation Rules**
   - Click "Configure Rules"
   - Add/edit escalation rules
   - Set triggers and targets
   - Test rules

**Guardrails and Safety Rules:**
- Critical alerts cannot be dismissed (must be resolved)
- Escalation rules require valid targets
- Alerts are archived (not deleted)
- Alert thresholds are configurable (owner-only)

**Error and Failure States:**
- **Alert Not Found**: "Alert not found. It may have been resolved or dismissed."
- **Escalation Failed**: "Escalation failed. Check target configuration."

**Permissions:**
- Owner: Full access (view all alerts, resolve, dismiss, configure rules)
- Admin (future): Limited access (view alerts, resolve; no configuration)
- Sitter: No access (cannot see alerts)

---

### 3.9 Messaging Setup Wizard

**Purpose:** Guided setup flow that replaces Twilio setup entirely. Operators complete initial configuration through a step-by-step wizard that handles all provider complexity.

**What the User Sees:**

**Wizard Flow (Step-by-Step):**

**Step 1: Connect Provider**
- **Provider Selection**: Select "Twilio" (other providers future)
- **Credential Input**:
  - Account SID (text field)
  - Auth Token (password field, masked)
- **Connection Test**: Button "Test Connection"
  - System validates credentials
  - Shows success/error message
- **Status Indicator**: "Connected" / "Connection Failed"
- **Next Button**: Enabled only after successful connection

**Step 2: Verify Connectivity**
- **Automatic Checks**:
  - Account access verified
  - API permissions checked
  - Account balance checked (if available)
- **Status Display**:
  - ✅ Account access: Verified
  - ✅ API permissions: Verified
  - ⚠️ Account balance: $X.XX (warning if low)
- **Error Handling**: If checks fail, show specific error and retry option
- **Next Button**: Enabled only after all checks pass

**Step 3: Front Desk Number**
- **Option 1: Buy New Number**
  - Area code selector or location search
  - Number preview (shows available numbers)
  - Cost preview
  - "Buy Number" button
- **Option 2: Import Existing Number**
  - Enter E164 or Twilio SID
  - System validates number exists in Twilio account
  - "Import Number" button
- **Status**: "Front Desk number: [E164]" or "No Front Desk number"
- **Requirement**: At least one Front Desk number required to proceed
- **Next Button**: Enabled only after Front Desk number is set

**Step 4: Sitter Numbers**
- **Option 1: Buy Numbers in Bulk**
  - Quantity selector (1-50)
  - Area code selector
  - Cost preview (total cost)
  - "Buy Numbers" button
- **Option 2: Import Existing Numbers**
  - Bulk import by SID list (paste comma-separated SIDs)
  - Or import one-by-one
  - System validates all numbers exist in Twilio account
  - "Import Numbers" button
- **Status**: "X sitter numbers available"
- **Requirement**: At least 1 sitter number recommended (not required)
- **Next Button**: Always enabled (can skip)

**Step 5: Pool Numbers**
- **Option 1: Buy Numbers in Bulk**
  - Quantity selector (1-20)
  - Area code selector
  - Cost preview
  - "Buy Numbers" button
- **Option 2: Import Existing Numbers**
  - Bulk import by SID list
  - Or import one-by-one
  - System validates all numbers
  - "Import Numbers" button
- **Status**: "X pool numbers available"
- **Requirement**: At least 1 pool number recommended (not required)
- **Next Button**: Always enabled (can skip)

**Step 6: Webhook Installation**
- **Automatic Process**: System automatically:
  - Generates webhook URL
  - Configures webhook in Twilio
  - Sets webhook for SMS and status callbacks
  - Verifies webhook signature
- **Status Display**:
  - ✅ Webhook URL configured: [URL]
  - ✅ SMS webhook: Active
  - ✅ Status callback: Active
  - ✅ Webhook verification: Verified
- **Error Handling**: If webhook installation fails, show error and retry option
- **Manual Override**: "Use custom webhook URL" (advanced, not recommended)
- **Next Button**: Enabled only after webhook is verified

**Step 7: System Readiness Validation**
- **Validation Checks**:
  - ✅ Provider connected
  - ✅ Front Desk number configured
  - ✅ Webhook installed and verified
  - ✅ At least one number available (Front Desk, Sitter, or Pool)
- **Readiness Status**: "System Ready" / "Setup Incomplete"
- **Blocking**: System blocks production usage until all required checks pass
- **Completion**: "Finish Setup" button
  - Completes wizard
  - Redirects to dashboard
  - Shows success message: "Messaging system is ready!"

**Primary Actions:**

1. **Complete Setup Wizard**
   - Follow all steps in order
   - System validates each step before allowing next
   - Cannot skip required steps (Front Desk number, webhook)
   - Can skip optional steps (Sitter numbers, Pool numbers)

2. **Retry Failed Steps**
   - If any step fails, show error message
   - "Retry" button to attempt again
   - Error messages are specific and actionable

3. **Save Progress**
   - Wizard state is saved automatically
   - Can exit and resume later
   - Progress indicator shows completed steps

4. **Re-run Setup**
   - Available in Provider & System Settings
   - "Re-run Setup Wizard" button
   - Useful for adding numbers or reconfiguring webhooks

**Guardrails and Safety Rules:**
- Cannot proceed to next step until current step is complete
- Front Desk number is required (cannot skip)
- Webhook installation is required (cannot skip)
- System blocks production usage until setup is complete
- All credentials are encrypted at rest
- Webhook URLs are validated before saving

**Error and Failure States:**
- **Connection Failed**: "Unable to connect to Twilio. Check Account SID and Auth Token."
- **Number Purchase Failed**: "Unable to purchase number. Check account balance or try different area code."
- **Webhook Installation Failed**: "Unable to install webhook. Check webhook URL or retry."
- **Validation Failed**: "Setup incomplete. Complete required steps to continue."

**Permissions:**
- Owner: Full access (can run setup wizard, modify configuration)
- Admin (future): View-only access (cannot modify provider settings)
- Sitter: No access (cannot see setup wizard)

---

### 3.8 Provider & System Settings

**Purpose:** Configure messaging provider settings, system-wide configurations, and integration status. Note: Initial setup should be done via Messaging Setup Wizard (Section 3.9).

**What the User Sees:**

**Provider Settings:**
- **Provider Status**: Connected / Disconnected / Error
- **Provider Type**: Twilio (current), others (future)
- **Account Information**:
  - Account SID
  - Auth token status (masked)
  - Webhook URL
  - Webhook status (verified / unverified)
- **Number Management**:
  - Numbers purchased via provider
  - Number capabilities
  - Number costs
- **Delivery Settings**:
  - Retry attempts
  - Retry backoff strategy
  - Delivery timeout
- **Webhook Configuration**:
  - Webhook URL
  - Webhook secret
  - Webhook verification status

**System Settings:**
- **Routing Defaults**:
  - Default routing target (Owner Inbox / Front Desk)
  - Assignment window evaluation rules
  - Pool number selection strategy
- **Number Management**:
  - Cooldown period (90 days default)
  - Health check thresholds
  - Quarantine rules
- **Policy Settings**:
  - Anti-poaching enforcement (on/off)
  - Content policy rules
  - Violation handling
- **Automation Settings**:
  - Default automation lanes
  - Execution limits
  - Retry policies

**Integration Status:**
- **Provider Integration**: Status, last sync, errors
- **Database Connection**: Status, latency
- **Webhook Endpoints**: Status, last received, errors

**Primary Actions:**

1. **Connect Provider**
   - Enter provider credentials
   - Test connection
   - Save configuration
   - Verify webhook

2. **Update Webhook URL**
   - Enter new webhook URL
   - Test webhook
   - Update provider configuration
   - Verify webhook

3. **Configure Delivery Settings**
   - Set retry attempts
   - Set retry backoff
   - Set delivery timeout
   - Save settings

4. **Update System Defaults**
   - Modify routing defaults
   - Update cooldown periods
   - Adjust health thresholds
   - Save settings

5. **Test Integration**
   - Click "Test Integration"
   - System tests provider connection
   - System tests webhook
   - Results displayed

**Guardrails and Safety Rules:**
- Provider credentials are encrypted at rest
- Webhook changes require verification
- System defaults cannot be set to unsafe values
- Cooldown periods cannot be set below 30 days

**Error and Failure States:**
- **Provider Connection Failed**: Show error message, retry button, check credentials
- **Webhook Verification Failed**: Show error message, check URL, retry verification
- **Invalid Settings**: "Invalid setting value. [Explanation]. Use valid range: [range]."

**Permissions:**
- Owner: Full access (view, edit all settings)
- Admin (future): View-only access (view settings; no edit)
- Sitter: No access (cannot see settings)

---

## 4. Core Operational Workflows

### 4.1 Sitter Onboarding

**Trigger:** New sitter is activated in the system.

**Steps:**
1. Owner activates sitter in sitter management
2. System automatically:
   - Assigns masked number to sitter (via `assignSitterMaskedNumber`)
   - Creates sitter masked number record
   - Links number to sitter
3. Owner sees confirmation in dashboard:
   - "Sitter [Name] activated. Masked number [E164] assigned."
4. Sitter receives notification:
   - "You've been activated. Your masked number is [E164]."

**Dashboard View:**
- Number Inventory shows new assignment
- Sitter profile shows assigned number
- Assignment status: "Active"

**Guardrails:**
- Cannot assign number if sitter already has active number
- Number must be available (not quarantined, not in cooldown)
- Assignment is logged in audit trail

**Failure Handling:**
- If no numbers available: "No sitter numbers available. Purchase number first?"
- If assignment fails: Show error, retry option, manual assignment option

---

### 4.2 Sitter Offboarding

**Trigger:** Owner deactivates sitter.

**Steps:**
1. Owner deactivates sitter in sitter management
2. System automatically:
   - Deactivates sitter masked number (via `deactivateSitterMaskedNumber`)
   - Quarantines number (90-day cooldown)
   - Reassigns active threads (via `reassignSitterThreads`)
   - Closes active assignment windows
3. Owner sees confirmation:
   - "Sitter [Name] deactivated. Number [E164] quarantined. [X] threads reassigned."
4. Reassignment messages sent to clients (if configured)

**Dashboard View:**
- Number Inventory shows number status: "Quarantined"
- Cooldown timer shows: "Available in [X] days"
- Threads show: "Reassigned to owner inbox"
- Assignment windows show: "Closed"

**Guardrails:**
- Cannot deactivate sitter if active assignment windows exist (without confirmation)
- Number cooldown cannot be bypassed
- Thread reassignment is logged in audit trail

**Failure Handling:**
- If thread reassignment fails: Show error, manual reassignment option
- If number quarantine fails: Show error, retry option

---

### 4.3 Weekly Client Assignment

**Trigger:** Owner assigns sitter to weekly recurring client.

**Steps:**
1. Owner navigates to Assignments & Windows
2. Owner selects:
   - Sitter
   - Client (weekly recurring)
   - Assignment type: "Weekly Client"
   - Time range (start/end dates)
3. System previews:
   - Assignment window will be created
   - Number will be assigned (sitter masked number)
   - Reassignment message will be sent (if client was previously assigned)
4. Owner confirms assignment
5. System automatically:
   - Creates assignment window
   - Assigns sitter masked number to thread
   - Sends reassignment message (if applicable)
6. Owner sees confirmation:
   - "Sitter [Name] assigned to [Client] from [start] to [end]. Window created."

**Dashboard View:**
- Assignment Windows shows new window
- Thread shows assigned sitter and number
- Calendar shows window in green (when active)

**Guardrails:**
- Cannot create overlapping windows for same thread (shows conflict)
- Assignment window must have valid time range
- Number assignment must succeed before window creation

**Failure Handling:**
- If window creation fails: Show error, retry option
- If number assignment fails: Show error, manual assignment option
- If reassignment message fails: Log error, continue (non-critical)

---

### 4.4 One-Time Booking with Pool Numbers

**Trigger:** Owner creates one-time booking for new client.

**Steps:**
1. Owner creates booking for one-time client
2. System automatically:
   - Creates thread for client
   - Determines number class: "Pool" (via `determineThreadNumberClass`)
   - Assigns pool number to thread (via `assignNumberToThread`)
3. Owner sees confirmation:
   - "Thread created for [Client]. Pool number [E164] assigned."
4. Client receives initial message from pool number

**Dashboard View:**
- Thread shows: "Pool number [E164]"
- Number Inventory shows pool number: "In use"
- Thread shows: "One-time client"

**Guardrails:**
- Pool number routing validates sender identity (prevents leakage)
- If sender not mapped to thread, routes to owner + auto-response
- Pool numbers can be reused immediately (routing safeguard prevents leakage)

**Failure Handling:**
- If no pool numbers available: "No pool numbers available. Purchase number first?"
- If pool routing fails: Route to owner inbox, log error

---

### 4.5 Pool Number Reuse Handling

**Trigger:** One-time booking ends, pool number becomes available.

**Steps:**
1. Booking ends, thread becomes inactive
2. System automatically:
   - Marks pool number as available (if no active threads)
   - Number returns to pool rotation
3. Owner sees in Number Inventory:
   - Pool number status: "Available"
   - Last usage: [Date]
4. When new one-time booking created:
   - System selects pool number (prefers numbers not recently used)
   - Assigns to new thread
   - Routing validates sender identity

**Dashboard View:**
- Number Inventory shows pool number: "Available" or "In use"
- Last usage timestamp updates
- Thread shows assigned pool number

**Guardrails:**
- Pool number reuse is immediate (no cooldown)
- Routing safeguard prevents leakage between clients
- Sender identity validation on every inbound message

**Failure Handling:**
- If pool number selection fails: Show error, manual assignment option
- If routing validation fails: Route to owner inbox, log error

---

### 4.6 Emergency Routing Override

**Trigger:** Owner needs to override routing temporarily (e.g., sitter unavailable, emergency situation).

**Steps:**
1. Owner navigates to Routing Control & Simulator
2. Owner selects thread
3. Owner enables "Override routing temporarily"
4. Owner selects:
   - Target: "Owner Inbox" / "Sitter" / "Client"
   - Duration: "1 hour" / "4 hours" / "24 hours" / "Until manually removed"
   - Reason: Text field (required)
5. Owner confirms override
6. System applies override:
   - All messages route to specified target
   - Override appears in routing history
   - Override expires automatically (if duration set)
7. Owner sees confirmation:
   - "Routing override active. Messages will route to [target] for [duration]."

**Dashboard View:**
- Routing Control shows override badge
- Thread shows override status
- Routing history shows override entry
- Override expires automatically (if duration set)

**Guardrails:**
- Override is temporary only (cannot be permanent)
- Override requires reason (audit trail)
- Override does not affect assignment windows (only routing target)
- Override expires automatically

**Failure Handling:**
- If override creation fails: Show error, retry option
- If override expires: Show notification, routing returns to normal

---

### 4.7 Delivery Failure Response

**Trigger:** Message delivery fails (provider error, invalid number, etc.).

**Steps:**
1. System detects delivery failure
2. System automatically:
   - Logs failure in audit trail
   - Updates message status: "Failed"
   - Records failure reason (provider error code)
   - Attempts retry (if within retry limit)
3. Owner sees alert in Alerts & Escalation:
   - "Delivery failure: [Thread] - [Reason]"
4. Owner navigates to thread or Delivery Failures feed
5. Owner views failure details:
   - Failure reason
   - Retry attempts
   - Provider error code
6. Owner actions:
   - Retry delivery (if retries available)
   - Mark as resolved (if non-retryable)
   - Contact support (if persistent issue)

**Dashboard View:**
- Alerts shows delivery failure alert
- Thread shows failed message with error badge
- Delivery Failures feed shows failure entry
- Message shows retry button (if retries available)

**Guardrails:**
- Automatic retries limited (max 3 attempts)
- Retry backoff strategy (exponential backoff)
- Manual retry requires owner approval after limit
- Delivery failures are logged in audit trail

**Failure Handling:**
- If retry fails: Show error, manual retry option
- If provider error persists: Show error, contact support link
- If number invalid: Show error, update number option

---

### 4.8 Policy Violation Review

**Trigger:** Message contains anti-poaching violation (phone number, email, URL, social media).

**Steps:**
1. System detects policy violation during message send/receive
2. System automatically:
   - Blocks message (does not send/receive)
   - Creates policy violation record
   - Logs violation in audit trail
   - Notifies owner via owner inbox
   - Sends warning to sender (if configured)
3. Owner sees alert in Alerts & Escalation:
   - "Policy violation: [Thread] - [Violation type]"
4. Owner navigates to Policy Violations feed
5. Owner views violation details:
   - Violation type
   - Detected content (redacted for privacy)
   - Sender (sitter/client)
   - Thread and context
6. Owner actions:
   - Review violation
   - Approve (override blocking, allow message)
   - Dismiss (violation resolved, no action needed)
   - Resolve (violation handled, mark as resolved)

**Dashboard View:**
- Alerts shows policy violation alert
- Policy Violations feed shows violation entry
- Thread shows blocked message with violation badge
- Message shows violation details (expandable)

**Guardrails:**
- Policy violations cannot be automatically approved (owner review required)
- Violation content is redacted for privacy (owner sees summary only)
- Override requires owner permission (logged in audit trail)
- Violations are logged permanently (cannot be deleted)

**Failure Handling:**
- If violation detection fails: Log error, allow message (fail-open for safety)
- If owner notification fails: Log error, retry notification
- If warning send fails: Log error, continue (non-critical)

---

### 4.9 Number Quarantine and Reassignment

**Trigger:** Owner quarantines number (delivery failures, policy violations, manual review).

**Steps:**
1. Owner navigates to Number Inventory
2. Owner selects number(s) to quarantine
3. Owner selects reason:
   - "Delivery failures"
   - "Policy violation"
   - "Manual review"
   - "Other" (with text field)
4. System previews impact:
   - Active threads affected
   - Routing changes
   - Cooldown period (90 days)
5. Owner confirms quarantine
6. System automatically:
   - Updates number status: "Quarantined"
   - Starts cooldown timer (90 days)
   - Reassigns active threads to alternative numbers
   - Routes messages to owner inbox (if no alternative)
   - Logs quarantine in audit trail
7. Owner sees confirmation:
   - "Number [E164] quarantined. [X] threads reassigned. Available in 90 days."

**Dashboard View:**
- Number Inventory shows number status: "Quarantined"
- Cooldown timer shows: "Available in [X] days"
- Threads show reassigned numbers
- Audit trail shows quarantine event

**Guardrails:**
- Cannot quarantine Front Desk number (must have at least one)
- Quarantine requires reason (audit trail)
- Cooldown period cannot be bypassed (90 days enforced)
- Thread reassignment is logged

**Failure Handling:**
- If thread reassignment fails: Show error, manual reassignment option
- If quarantine fails: Show error, retry option
- If Front Desk number selected: Show error, "Cannot quarantine Front Desk number"

**Reassignment After Cooldown:**
1. Cooldown period completes (90 days)
2. Owner sees notification:
   - "Number [E164] cooldown complete. Available for pool assignment."
3. Owner can release number from quarantine
4. System automatically:
   - Updates number status: "Available" (pool)
   - Number becomes available for assignment
5. Owner sees confirmation:
   - "Number [E164] released from quarantine. Available for pool assignment."

---

## 5. UX Standards and Safety Rules

### 5.1 Default Behaviors

**Principle:** System defaults should be safe and prevent errors.

**Implementation:**
- **Number Assignment**: Default to pool for one-time clients, sitter masked for assigned sitters
- **Routing**: Default to owner inbox if no assignment window active
- **Automations**: Default to "Draft" status (requires activation)
- **Overrides**: Default to temporary (cannot be permanent)
- **Retries**: Default to 3 attempts with exponential backoff
- **Cooldown**: Default to 90 days (cannot be reduced below 30 days)

**Rationale:** Safe defaults prevent accidental misconfigurations and ensure system stability.

---

### 5.2 Confirmation Requirements

**Principle:** Irreversible or high-impact actions require explicit confirmation.

**Actions Requiring Confirmation:**
- **Number Quarantine**: Shows impact preview, requires reason
- **Sitter Offboarding**: Shows affected threads, requires confirmation
- **Assignment Window Deletion**: Shows routing impact, requires confirmation
- **Automation Deletion**: Shows execution history, requires confirmation
- **Routing Override**: Shows target and duration, requires reason
- **Provider Settings Change**: Shows impact, requires confirmation
- **Number Purchase**: Shows cost preview, requires confirmation

**Confirmation Dialog Standards:**
- **Title**: Action name (e.g., "Quarantine Number")
- **Description**: What will happen (e.g., "This will affect 3 active threads")
- **Impact Preview**: List of affected entities
- **Reason Field**: Required for audit trail (where applicable)
- **Actions**: "Cancel" (primary, left) and "Confirm" (secondary, right, colored)
- **Destructive Actions**: "Confirm" button is red

**Rationale:** Confirmation prevents accidental actions and ensures operators understand impact.

---

### 5.3 Irreversible Action Handling

**Principle:** Irreversible actions should be clearly marked and require extra confirmation.

**Irreversible Actions:**
- **Number Quarantine**: 90-day cooldown cannot be bypassed
- **Sitter Offboarding**: Number deactivation and thread reassignment
- **Automation Deletion**: Automation archived (not truly deleted, but effectively irreversible)
- **Audit Log Deletion**: Not allowed (archived only)

**Handling:**
- **Visual Indicator**: Red badge or icon on irreversible actions
- **Extra Confirmation**: Two-step confirmation for highly destructive actions
- **Impact Preview**: Show all affected entities before confirmation
- **Audit Trail**: Log all irreversible actions with timestamp and actor

**Rationale:** Irreversible actions can cause significant disruption; extra safeguards prevent mistakes.

---

### 5.4 Visibility Guarantees

**Principle:** Operators must always see system state. No hidden queues, no silent failures.

**Implementation:**
- **Real-Time Updates**: Thread unread counts, message delivery status, assignment window status
- **Status Indicators**: Every entity shows current status (Active, Inactive, Quarantined, etc.)
- **Error Visibility**: All errors are shown in UI, not just logged
- **Queue Visibility**: Automation queue, retry queue, webhook queue (if applicable)
- **State Consistency**: UI always reflects database state (no stale data)

**Rationale:** Visibility builds trust and enables operators to make informed decisions.

---

### 5.5 Error Messaging Tone

**Principle:** Error messages should be helpful, actionable, and non-technical.

**Error Message Standards:**
- **Human Language**: No technical jargon (e.g., "Number not found" not "MessageNumber entity missing")
- **Actionable**: Tell operator what to do (e.g., "No pool numbers available. Purchase number first?")
- **Contextual**: Show what was attempted (e.g., "Failed to assign number to sitter [Name]")
- **Helpful**: Provide next steps (e.g., "Check number status or retry assignment")
- **Non-Blameful**: Don't blame operator (e.g., "Unable to process" not "You entered invalid data")

**Examples:**
- ❌ Bad: "Error: MessageNumber entity not found for ID abc123"
- ✅ Good: "Number not found. It may have been deleted or reassigned. Check number inventory."

- ❌ Bad: "ValidationError: Invalid time range"
- ✅ Good: "End time must be after start time. Please adjust the assignment window."

**Rationale:** Helpful error messages reduce operator frustration and enable quick resolution.

---

### 5.6 Performance Expectations

**Principle:** Dashboard should feel fast and responsive. Slow operations show progress.

**Performance Targets:**
- **Page Load**: < 2 seconds for list views, < 3 seconds for detail views
- **Action Response**: < 1 second for simple actions (toggle, filter), < 3 seconds for complex actions (assign, quarantine)
- **Real-Time Updates**: < 500ms for status updates (delivery status, unread counts)
- **Search/Filter**: < 500ms for text search, < 1 second for complex filters

**Progress Indicators:**
- **Loading States**: Spinner or skeleton screen during data fetch
- **Action Progress**: Progress bar for long-running actions (number purchase, bulk operations)
- **Background Operations**: Toast notification for background operations (automation execution, message send)

**Rationale:** Fast, responsive UI improves operator experience and reduces frustration.

---

### 5.7 Zero Telecom Knowledge Required

**Principle:** Operators should never need to understand Twilio, webhooks, SIP, messaging services, callbacks, phone SID formats, or carrier restrictions. The dashboard translates all infrastructure complexity into business actions.

**Implementation:**
- **No Technical Terms**: All UI uses business language:
  - "Business number" not "Twilio phone number"
  - "Connect provider" not "Configure Twilio API"
  - "Setup messaging" not "Install webhooks"
  - "Number inventory" not "Phone number resources"
- **Guided Workflows**: Complex operations are broken into simple steps:
  - Setup wizard guides through provider connection
  - Number purchase shows cost and preview (no SID management)
  - Webhook installation is automatic (no URL configuration)
- **Error Translation**: All provider errors are translated:
  - "Unable to send message" not "Twilio API error 21211"
  - "Number not available" not "Carrier restriction violation"
  - "Check provider connection" not "Verify webhook signature"
- **Business Context**: All actions are framed in business terms:
  - "Assign sitter to client" not "Create proxy session"
  - "Buy business number" not "Purchase Twilio phone number"
  - "View message history" not "Query Twilio message logs"

**What Operators Never Need to Know:**
- Webhook URLs or callback configuration
- SIP protocols or carrier restrictions
- Phone SID formats or Twilio resource IDs
- Message SID formats or provider message IDs
- Carrier compliance or regulatory requirements
- Twilio console navigation or API documentation

**What Operators Do Need to Know:**
- How to connect their Twilio account (Account SID, Auth Token)
- How to buy or import business numbers
- How to assign numbers to sitters
- How to view messages and manage threads
- How to configure automations

**Example:** Instead of "Configure Twilio webhook at https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages.json with signature validation", operators see "Setup complete. Your messaging system is ready to receive messages."

**Rationale:** Operators are business owners, not telecom engineers. The dashboard must hide all infrastructure complexity and present only business-relevant information and actions.

---

### 5.8 No Direct Provider Dependence

**Principle:** Any operation that would normally require logging into Twilio must be supported in the dashboard. If something requires Twilio access, the dashboard is incomplete.

**Implementation:**
- **Complete Coverage**: All operational workflows must be possible inside the dashboard:
  - Buying numbers (not just viewing)
  - Assigning numbers (not just seeing assignments)
  - Releasing numbers (not just viewing status)
  - Changing routing behavior (not just viewing rules)
  - Viewing failures (not just success messages)
  - Diagnosing issues (not just error codes)
- **Provider Independence**: Operators should only need Twilio access for:
  - Billing and account management (outside messaging operations)
  - Emergency support (when dashboard is unavailable)
  - Initial account creation (one-time setup)
- **Self-Service**: Dashboard must enable self-service for all normal operations:
  - No "contact support" required for routine tasks
  - No "check Twilio console" required for diagnostics
  - No "configure manually" required for setup

**Operations That Must Be Supported:**
- ✅ Buy new numbers (with cost preview)
- ✅ Import existing numbers (by SID or E164)
- ✅ Assign numbers to sitters
- ✅ Release numbers to pool
- ✅ Quarantine numbers
- ✅ View number health and delivery status
- ✅ Diagnose delivery failures (with actionable steps)
- ✅ Configure webhooks (automatic, no manual setup)
- ✅ View provider connection status
- ✅ Test provider connectivity
- ✅ View message delivery status
- ✅ Retry failed messages
- ✅ View provider error details (translated to human language)

**Operations That May Require Twilio Access:**
- ❌ Billing and payment (Twilio account management)
- ❌ Account-level settings (outside messaging scope)
- ❌ Emergency support (when dashboard unavailable)

**Failure Criteria:**
- If operator must log into Twilio to complete a normal operation → Dashboard is incomplete
- If operator must contact support for routine tasks → Dashboard is incomplete
- If operator must understand Twilio concepts → Dashboard is incomplete

**Example:** If a number purchase fails, the dashboard should show "Unable to purchase number. Check account balance or try different area code" with a "Retry" button. Operators should never need to log into Twilio to check account balance or retry the purchase.

**Rationale:** The dashboard is the complete interface for messaging operations. Twilio access should be an exception, not a requirement.

---

## 6. Scalability and Enterprise Readiness

### 6.1 Expected Scale Assumptions

**Current Scale (Baseline):**
- **Numbers**: 10-100 phone numbers per organization
- **Threads**: 100-1,000 active threads per organization
- **Messages**: 1,000-10,000 messages per month per organization
- **Sitters**: 10-50 sitters per organization
- **Clients**: 100-1,000 clients per organization
- **Automations**: 10-50 automations per organization

**Future Scale (Growth):**
- **Numbers**: 100-1,000 phone numbers per organization
- **Threads**: 1,000-10,000 active threads per organization
- **Messages**: 10,000-100,000 messages per month per organization
- **Sitters**: 50-500 sitters per organization
- **Clients**: 1,000-10,000 clients per organization
- **Automations**: 50-200 automations per organization

**Multi-Tenant Scale:**
- **Organizations**: 100-1,000 organizations
- **Total Numbers**: 10,000-100,000 numbers
- **Total Messages**: 1M-10M messages per month
- **Total Threads**: 100K-1M active threads

**Rationale:** Scale assumptions inform database design, caching strategy, and performance optimizations.

---

### 6.2 Observability Requirements

**Principle:** System must be fully observable at scale. Every operation is logged, every metric is tracked.

**Observability Components:**

1. **Structured Logging**:
   - All operations log structured JSON
   - Log levels: DEBUG, INFO, WARN, ERROR
   - Log aggregation: Centralized log storage (e.g., Datadog, CloudWatch)
   - Log retention: 90 days (configurable)

2. **Metrics**:
   - **Message Metrics**: Send rate, delivery rate, failure rate, latency
   - **Routing Metrics**: Routing decision counts, override counts, conflict counts
   - **Number Metrics**: Assignment rate, quarantine rate, cooldown completion rate
   - **Automation Metrics**: Execution rate, success rate, failure rate, latency
   - **System Metrics**: API latency, database query time, cache hit rate

3. **Tracing**:
   - Distributed tracing for message flow (send → delivery → status update)
   - Trace ID propagation across services
   - Trace visualization in observability platform

4. **Alerting**:
   - **Critical Alerts**: Delivery failure rate > 5%, system errors, provider outages
   - **Warning Alerts**: Response time > SLA, automation failures, number health issues
   - **Info Alerts**: High message volume, new thread creation, assignment changes

**Rationale:** Observability enables operators to detect issues early, debug problems quickly, and optimize performance.

---

### 6.3 Operational Resilience

**Principle:** System must handle failures gracefully and recover automatically where possible.

**Resilience Strategies:**

1. **Provider Failures**:
   - **Retry Logic**: Exponential backoff, max 3 attempts
   - **Fallback**: Queue messages for retry, notify operator
   - **Circuit Breaker**: Stop sending if provider fails repeatedly
   - **Health Checks**: Monitor provider status, alert on failures

2. **Database Failures**:
   - **Connection Pooling**: Handle connection failures gracefully
   - **Retry Logic**: Retry transient failures
   - **Read Replicas**: Use read replicas for queries (reduce primary load)
   - **Backup**: Daily backups, point-in-time recovery

3. **Webhook Failures**:
   - **Retry Logic**: Retry failed webhooks with exponential backoff
   - **Dead Letter Queue**: Store failed webhooks for manual retry
   - **Verification**: Verify webhook signatures, reject invalid requests

4. **Automation Failures**:
   - **Error Handling**: Catch and log automation errors
   - **Retry Logic**: Retry failed automations (configurable)
   - **Circuit Breaker**: Disable automations if they fail repeatedly
   - **Manual Override**: Allow operators to disable failing automations

**Rationale:** Resilience ensures system continues operating despite failures, reducing operator burden.

---

### 6.4 Failure Isolation

**Principle:** Failures in one area should not cascade to other areas. Isolate failures to prevent system-wide outages.

**Isolation Strategies:**

1. **Number Isolation**:
   - Quarantine individual numbers without affecting others
   - Pool number failures don't affect sitter numbers
   - Front Desk number failures are critical (alert immediately)

2. **Thread Isolation**:
   - Thread failures don't affect other threads
   - Routing failures route to owner inbox (safe fallback)
   - Assignment window failures don't block message delivery

3. **Automation Isolation**:
   - Automation failures don't block message delivery
   - Failed automations are logged and disabled (if repeated failures)
   - Automation queue is isolated from message delivery

4. **Provider Isolation**:
   - Provider failures don't block dashboard access
   - Provider retries are isolated (don't block other operations)
   - Multiple provider support (future) allows failover

**Rationale:** Failure isolation prevents cascading failures and ensures partial system availability.

---

### 6.5 Future Expansion Readiness

**Principle:** System architecture must support future expansion without major rewrites.

**Expansion Areas:**

1. **Additional Providers**:
   - Provider abstraction layer supports multiple providers
   - Dashboard shows provider-agnostic interface
   - Provider-specific features are optional (graceful degradation)

2. **Additional Message Types**:
   - Architecture supports SMS, MMS, email, push notifications
   - Dashboard shows message type badges
   - Message type-specific features are optional

3. **Additional Roles**:
   - Role system is extensible (Admin, Manager, etc.)
   - Permissions are granular (resource + action)
   - Dashboard shows role-specific views

4. **Additional Automation Lanes**:
   - Automation system supports custom lanes
   - Dashboard shows lane-specific automations
   - Lane-specific features are optional

5. **Advanced Analytics**:
   - Metrics system is extensible
   - Dashboard shows customizable charts
   - Export functionality supports multiple formats

6. **AI Features**:
   - Architecture supports AI integration (message classification, sentiment analysis)
   - Dashboard shows AI insights (optional)
   - AI features are non-blocking (graceful degradation)

**Rationale:** Expansion readiness ensures system can grow with business needs without major rewrites.

---

## Document Maintenance

**Version History:**
- **v1.0** (2026-01-19): Initial canonical specification
- **v1.1** (2026-01-19): Added Twilio abstraction layer, masking invisibility, setup wizard, zero telecom knowledge requirement, and no direct provider dependence principles

**Review Process:**
- This document is the single source of truth for dashboard product decisions
- All UI tickets must reference relevant sections
- All new features must align with principles and workflows defined here
- Document should be reviewed quarterly or when major features are added

**Change Management:**
- Major changes require product owner approval
- Minor changes (clarifications, typo fixes) can be made directly
- All changes should be documented in version history

---

**End of Specification**
