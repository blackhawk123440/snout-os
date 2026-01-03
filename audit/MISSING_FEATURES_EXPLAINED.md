# Missing Features Explained

**Purpose**: Clear explanation of what each missing feature does and why it matters

---

## 🔍 Global Search

**What It Does**: A search bar in the header/navigation that lets users quickly find bookings, clients, sitters, or other data across the entire dashboard.

**How It Would Work**:
- Search input in the AppShell header (top bar)
- Type a query (e.g., "John Smith" or "booking #123")
- Results show matching bookings, clients, sitters
- Click result to navigate directly to that item

**Why It Matters**:
- **Current Problem**: Users must navigate to specific pages (Bookings, Clients, Sitters) and use individual search boxes
- **Impact**: Slower workflow, especially when you know a client name but don't remember which page they're on
- **Example**: "I need to find John's booking from last week" → Currently: Go to Bookings → Search → Filter → Find. With global search: Type "John" → Click result → Done

**Where It Should Go**: `src/components/layout/AppShell.tsx` header section (around line 100-145)

---

## 🔔 Global Notifications Center

**What It Does**: A notification bell icon in the header that shows alerts and important events without navigating away from the current page.

**How It Would Work**:
- Bell icon in top bar (next to user menu)
- Badge shows count of unread notifications
- Click bell → Dropdown or sidebar shows notifications
- Notifications include:
  - Unpaid bookings
  - Unassigned bookings (urgent)
  - Automation failures
  - Payment failures
  - Pricing drift alerts

**Why It Matters**:
- **Current Problem**: Users must navigate to `/exceptions` page to see issues
- **Impact**: Critical issues (unpaid bookings, unassigned bookings) go unnoticed until manually checking
- **Example**: A booking is unpaid and due tomorrow → Currently: Must remember to check exceptions page. With notifications: Red badge on bell → Click → See "Unpaid booking: John Smith - $150" → Click → Go to booking

**Where It Should Go**: `src/components/layout/AppShell.tsx` header section (around line 100-145)

---

## 📄 Pagination

**What It Does**: Limits how many records load at once and provides page navigation controls (Previous/Next, page numbers).

**How It Would Work**:
- Bookings list shows 50 bookings per page (configurable)
- "Previous" and "Next" buttons at bottom
- Page numbers (1, 2, 3, ...)
- URL updates: `/bookings?page=2&limit=50`

**Why It Matters**:
- **Current Problem**: `src/app/api/bookings/route.ts` loads ALL bookings with `findMany()` (no limit)
- **Impact**: 
  - Performance: With 1000+ bookings, page loads slowly or crashes
  - Memory: Browser uses excessive memory loading all data
  - User experience: Long scroll, slow filtering
- **Example**: 500 bookings in database → Currently: All 500 load at once, page is slow. With pagination: Load 50 at a time, fast and responsive

**Where It Should Go**: 
- API: `src/app/api/bookings/route.ts` (add `limit` and `offset` query params)
- UI: `src/app/bookings/page.tsx` (add pagination controls)

---

## 🔒 Optimistic Concurrency Control

**What It Does**: Prevents two users from overwriting each other's changes when editing the same booking simultaneously.

**How It Would Work**:
- Each booking has a `version` number (starts at 0, increments on each update)
- When editing: Send current version with update
- Server checks: "Is version still X?" 
  - If yes → Update succeeds, increment version
  - If no → Reject update, return error "Booking was modified by another user"
- UI shows error: "This booking was just updated. Refresh to see latest changes."

**Why It Matters**:
- **Current Problem**: Two users editing same booking → Last save wins, first user's changes are lost
- **Impact**: 
  - Data loss: User A changes notes, User B changes status → One change is lost
  - Revenue risk: User A updates price, User B updates sitter → Price change lost
- **Example**: 
  - User A opens booking at 2:00 PM, starts editing notes
  - User B opens same booking at 2:01 PM, changes status to "confirmed"
  - User B saves at 2:02 PM (status = confirmed)
  - User A saves at 2:03 PM (notes updated, but status reverts to "pending")
  - **Result**: User B's status change is lost!

**Where It Should Go**:
- Database: Add `version: Int @default(0)` to Booking model in `prisma/schema.prisma`
- API: `src/app/api/bookings/[id]/route.ts` (check version before update)
- UI: `src/app/bookings/[id]/page.tsx` (handle version mismatch errors)

---

## 👁️ Template Preview

**What It Does**: Shows how a message template will look when rendered with actual data, before saving.

**How It Would Work**:
- Template edit page has two panes: Editor (left) and Preview (right)
- Preview shows template with sample data:
  - `{{firstName}}` → "John"
  - `{{service}}` → "Dog Walking"
  - `{{date}}` → "Jan 27, 2025"
  - `{{totalPrice}}` → "$150.00"
- Preview updates in real-time as you type

**Why It Matters**:
- **Current Problem**: Users must save template, send test message, check result, edit again if wrong
- **Impact**: Trial-and-error template editing, wasted time
- **Example**: 
  - Template: "Hi {{firstName}}, your {{service}} is confirmed for {{date}}"
  - Without preview: Save → Test → Realizes date format is wrong → Edit → Save → Test again
  - With preview: See "Hi John, your Dog Walking is confirmed for Jan 27, 2025" → Adjust format immediately → Save once

**Where It Should Go**: `src/app/templates/[id]/page.tsx` (add preview pane)

---

## 💬 Conversation Threads

**What It Does**: Groups messages by client/booking so you can see the full conversation history in one place.

**How It Would Work**:
- Messages page shows conversations grouped by client
- Each conversation shows:
  - Client name
  - All messages sent/received for that client
  - Chronological order (oldest to newest)
  - Booking context (which booking each message relates to)

**Why It Matters**:
- **Current Problem**: Messages are linked to bookings but not threaded. To see all messages with a client, must check each booking individually
- **Impact**: Hard to track communication history with clients
- **Example**: 
  - Client "John Smith" has 3 bookings
  - Booking 1: 2 messages
  - Booking 2: 1 message  
  - Booking 3: 3 messages
  - **Current**: Must open each booking to see messages
  - **With threads**: One "John Smith" conversation shows all 6 messages in order

**Where It Should Go**: `src/app/messages/page.tsx` (currently manages templates, needs conversation view)

---

## 📊 Export Capability

**What It Does**: Allows downloading data (EventLog, bookings, reports) as CSV or Excel files for analysis or compliance.

**How It Would Work**:
- Export button on EventLog viewer, bookings list, etc.
- Click "Export" → Choose format (CSV, Excel, JSON)
- Download file with all data (or filtered data)

**Why It Matters**:
- **Current Problem**: Cannot export data for external analysis or compliance reporting
- **Impact**: 
  - Compliance: May need to provide audit logs to regulators
  - Analysis: Want to analyze data in Excel/Google Sheets
  - Backup: Manual data export for records
- **Example**: Tax season → Need all bookings from 2024 → Currently: Must manually copy data. With export: Click "Export 2024 Bookings" → CSV file → Open in Excel

**Where It Should Go**: 
- API: `src/app/api/event-logs/export/route.ts` (new endpoint)
- UI: `src/app/settings/automations/ledger/page.tsx` (add export button)

---

## 📝 Operational Notes (Separate from Client Notes)

**What It Does**: Two separate note fields on bookings:
- **Client Notes**: Visible to client (shown in confirmations, reports)
- **Operational Notes**: Internal only (sitter instructions, special handling, owner notes)

**How It Would Work**:
- Booking detail page has two sections:
  - "Client Notes" (what client sees)
  - "Internal Notes" (owner/sitter only)
- Internal notes never sent to client in messages

**Why It Matters**:
- **Current Problem**: Single `notes` field means internal notes (e.g., "Client is difficult, charge extra") might accidentally be sent to client
- **Impact**: 
  - Privacy: Internal notes might leak to clients
  - Clarity: Can't separate "what client needs to know" from "what we need to remember"
- **Example**: 
  - Client note: "Please use side door, main door is broken"
  - Internal note: "Client has payment issues, require prepayment"
  - **Current**: Both in same field, risk of sending internal note to client
  - **With separation**: Client gets door instruction, internal team sees payment warning

**Where It Should Go**:
- Database: Add `operationalNotes: String?` to Booking model
- UI: `src/app/bookings/[id]/page.tsx` (add separate notes section)

---

## 💰 Upcoming Payouts

**What It Does**: Shows scheduled payouts to sitters (when completed bookings will be paid out).

**How It Would Work**:
- Payments page shows "Upcoming Payouts" section
- Lists:
  - Sitter name
  - Completed bookings (not yet paid)
  - Total payout amount
  - Scheduled payout date
- Helps plan cash flow

**Why It Matters**:
- **Current Problem**: Cannot see when payouts are due. Must calculate manually from completed bookings
- **Impact**: 
  - Cash flow planning: Don't know how much to pay sitters this week
  - Sitter relations: Sitters may ask "when do I get paid?"
- **Example**: 
  - 10 bookings completed this week
  - Total payout: $800 (80% commission)
  - **Current**: Must manually calculate
  - **With upcoming payouts**: See "$800 due to 3 sitters on Friday"

**Where It Should Go**: 
- API: Calculate from completed bookings with `paymentStatus = 'paid'` but sitter not yet paid
- UI: `src/app/payments/page.tsx` (add upcoming payouts section)

---

## 🔄 Retry Controls

**What It Does**: Allows manually retrying failed operations (automation failures, webhook failures, message failures).

**How It Would Work**:
- Exceptions page shows failed items
- "Retry" button next to each failure
- Click retry → System attempts operation again
- Success/failure logged to EventLog

**Why It Matters**:
- **Current Problem**: "Retry" buttons exist in UI but functionality not verified. Failures must be fixed manually or wait for automatic retry
- **Impact**: 
  - Automation failures: Must manually trigger or wait
  - Webhook failures: Payment confirmations might be missed
- **Example**: 
  - Automation "booking confirmation" failed (OpenPhone API was down)
  - **Current**: Must wait for automatic retry or manually send message
  - **With retry**: Click "Retry" → Automation runs again → Success

**Where It Should Go**: 
- API: `src/app/api/exceptions/[id]/retry/route.ts` (new endpoint)
- Service: Implement retry logic for each exception type
- UI: Wire retry buttons in `src/app/exceptions/page.tsx`

---

## 🎨 Automation Builder UI

**What It Does**: Visual interface to create custom automations (triggers, conditions, actions) without writing code.

**How It Would Work**:
- Page: `/automation-center/new`
- Builder interface:
  - **Trigger**: Select event (e.g., "Booking Created", "Payment Received")
  - **Conditions**: Add rules (e.g., "If service is 'Housesitting'", "If total > $200")
  - **Actions**: Select what to do (e.g., "Send SMS to client", "Assign sitter", "Update status")
- Preview: See what automation will do
- Save: Creates Automation record in database

**Why It Matters**:
- **Current Problem**: Automation models exist in database, but no UI to create them. Must use database directly or API
- **Impact**: 
  - Flexibility: Cannot create custom automations for business needs
  - Accessibility: Non-technical users cannot create automations
- **Example**: 
  - Want automation: "If booking is Housesitting and total > $300, automatically assign to Tier 2 sitters"
  - **Current**: Must write database queries or API calls
  - **With builder**: Select trigger → Add conditions → Choose action → Save

**Where It Should Go**: 
- UI: `src/app/automation-center/new/page.tsx` (builder interface)
- API: Wire to existing Automation, AutomationCondition, AutomationAction models

---

## 📋 Service Type Filter

**What It Does**: Dropdown filter on bookings list to show only specific service types (e.g., "Show only Dog Walking").

**How It Would Work**:
- Filter dropdown: "All Services", "Dog Walking", "Drop-ins", "Housesitting", etc.
- Select service → List filters to show only that service type

**Why It Matters**:
- **Current Problem**: Can search by service name, but no quick filter dropdown
- **Impact**: Must type service name to filter, slower workflow
- **Example**: Want to see all Housesitting bookings → Currently: Type "Housesitting" in search. With filter: Select "Housesitting" from dropdown → Done

**Where It Should Go**: `src/app/bookings/page.tsx` (add service filter dropdown)

---

## 👥 Sitter Filter

**What It Does**: Dropdown filter on bookings list to show only bookings assigned to a specific sitter.

**How It Would Work**:
- Filter dropdown: "All Sitters", then list of sitters
- Select sitter → List filters to show only that sitter's bookings

**Why It Matters**:
- **Current Problem**: Can search by sitter name, but no quick filter
- **Impact**: Must type sitter name to filter
- **Example**: Want to see all bookings for "Sarah Johnson" → Currently: Type "Sarah" in search. With filter: Select "Sarah Johnson" from dropdown → Done

**Where It Should Go**: `src/app/bookings/page.tsx` (add sitter filter dropdown)

---

## Summary: Missing Features Impact

### High Impact (P0 - Revenue/Security Risk)
1. **Pagination** - Performance issues with large datasets
2. **Optimistic Concurrency** - Data loss from concurrent edits

### Medium Impact (P1 - Operations Pain)
3. **Global Search** - Slower user workflow
4. **Global Notifications** - Missed critical alerts
5. **Template Preview** - Trial-and-error template editing
6. **Automation Builder UI** - Cannot create custom automations
7. **Retry Controls** - Cannot manually retry failures

### Low Impact (P2 - Quality of Life)
8. **Conversation Threads** - Harder to track client communication
9. **Export Capability** - Cannot export data for analysis
10. **Operational Notes** - Risk of leaking internal notes to clients
11. **Upcoming Payouts** - Cannot see payout schedule
12. **Service Type Filter** - Slower filtering workflow
13. **Sitter Filter** - Slower filtering workflow
14. **Payment Status Filter** - Slower filtering workflow
15. **Date Range Filter** - Only "today" filter exists

---

**Total Missing Features**: 15 items  
**Priority**: 3 P0, 5 P1, 7 P2

