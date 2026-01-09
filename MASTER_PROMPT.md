# SNOUT OS DASHBOARD
## CANONICAL MASTER PROMPT
### MOBILE FIRST • ENTERPRISE GRADE • ZERO DRIFT

You are working on Snout OS, an internal enterprise operating system for a real pet care business that handles bookings, scheduling, payments, payroll, automations, messaging, and staff management.

This system is not a demo, not an MVP, and not a UI experiment.
It is a production operations platform that must scale revenue, reduce manual labor, and maintain absolute consistency.

This prompt overrides all prior assumptions.

## PRIMARY OBJECTIVE

Deliver a complete, consistent, mobile-first enterprise dashboard where:

• Every requested feature exists end-to-end
• Every UI rule is universal, not page-specific
• There is zero duplicate code or parallel logic
• Mobile UX is deliberate, not reactive
• Desktop will be addressed later, but mobile must be correct now

**Half-implemented features are considered not implemented.**

## NON-NEGOTIABLE EXECUTION RULES

### MOBILE FIRST ONLY
All decisions are made for mobile first.
Desktop adaptations come later.

### UNIVERSAL SYSTEM LAWS
If something is fixed or implemented on one page, it must be implemented everywhere it applies using shared primitives.
Page-specific hacks are not allowed.

### NO DUPLICATE LOGIC
- No duplicate schedule logic
- No duplicate pricing logic
- No duplicate layout logic
- No duplicate action logic

Everything reusable must be centralized.

### NO INFERENCE
Do not invent features.
Do not simplify requirements.
Do not guess intent.

If something is unclear, use existing canon from prior messages and documentation.

### ENTERPRISE STANDARD
If Stripe, Linear, Shopify Admin, OpenPhone, or Gusto would do something better, you must match or exceed that standard.

## UNIVERSAL UI LAWS (GLOBAL)

These laws apply to every page, every component, every state.

### ZERO HORIZONTAL SCROLL ON MOBILE
Absolutely no horizontal scrolling anywhere.
Enforced at AppShell, layout, and component level.

### BUTTONS MUST LOOK LIKE BUTTONS
• Clear primary, secondary, destructive styles
• 44px minimum touch target
• Consistent padding, radius, and typography
• No text pretending to be a button

### ONE MOBILE SPACING SCALE
• One spacing system
• No per-page overrides
• Tokens only

### ONE MODAL BEHAVIOR
• All modals become full-height bottom sheets on mobile
• No clipped content
• No nested scroll traps

### ONE TABLE → MOBILE CARD PATTERN
• Any table becomes cards on mobile
• Requires mobileLabel and mobileOrder
• No custom table layouts per page
• Missing mobile metadata = incomplete implementation

### ONE FILTER SYSTEM
• All mobile filters use MobileFilterBar
• Scrollable chips
• Clear active state
• Same pattern across bookings, clients, payments, payroll, automations

### ONE DETAIL PAGE PATTERN
All entity detail pages must have:
• Sticky summary header
• Single scroll container
• Collapsible sections
• Bottom action bar for primary actions
• No iOS scroll jitter

### ONE ACTION ARCHITECTURE
Actions are always grouped as:
• Operational
• Financial
• Utility
• Destructive

Same structure everywhere.

### ONE SCHEDULE RENDERING ENGINE
Shared schedule renderer used everywhere.

Rules:
• Housesitting / 24-7 care → start date + end date + range
• Drop-ins / walks / pet taxi → per-date entries with duration labels
• Used in booking list, booking detail, sitter dashboard, sitter calendar

### ONE ASSIGNMENT VISIBILITY CONTRACT
If something can be assigned, assignment must appear everywhere:
• Booking list
• Booking detail
• Sitter dashboard
• Sitter calendar
• Payroll
• Automations

Must support assign, reassign, unassign.

## FEATURE COMPLETENESS RULE

If a feature exists, it must exist everywhere it logically belongs.

Examples:
• Tier badges must appear everywhere sitters appear
• Payment status must appear everywhere bookings appear
• Edit booking must be available on mobile and desktop
• Assignments must be visible across all related views

Partial presence is failure.

## REQUIRED FEATURES (MUST EXIST)

### Bookings
• Full lifecycle states
• Edit booking on mobile
• Correct schedule display per service
• Payment + tip actions
• Assignment management
• Zero horizontal scroll

### Calendar
• Proper mobile calendar layout
• Agenda and month views readable
• Sitter filtering
• Consistent date controls

### Clients
• No horizontal scroll
• Mobile card layout
• Booking history
• Payment visibility

### Sitters
• Tier system with visible badges
• Commission visibility
• Assignment visibility
• Sitter dashboard with real calendar layout

### Automations
• Fully visible cards on mobile
• No clipped actions
• Editable automations
• Persistent settings

### Payments
• Stripe truth parity
• One-off jobs + subscriptions
• All historical payments
• Charts, graphs, comparisons
• Revenue must match Stripe exactly

### Payroll
• Enterprise-grade payroll UI
• Pay periods
• Earnings breakdown
• Approval states
• Automation-ready
• Time-saving by default

### Messaging
• Template management
• Automation integration
• Masked numbers via OpenPhone
• Conversation visibility

## FEATURE REQUEST HANDLING RULE

When implementing, you must:

1. Enumerate all features requested across canon and messages
2. Map each feature to all pages it touches
3. Implement each feature once as a shared primitive
4. Apply it everywhere it belongs
5. Prove completion with evidence

## REQUIRED DELIVERABLES

### SYSTEM_FEATURE_INVENTORY.md
• Every feature
• Status
• File paths
• Evidence

### CROSS_PAGE_CONSISTENCY_MAP.md
For each universal law and major feature:
• Shared primitive
• Pages using it
• Evidence
• Exceptions (if any)

### MOBILE_UI_ACCEPTANCE_CHECKLIST.md
• iOS viewport verification
• No horizontal scroll
• Button validation
• Scroll behavior

## ACCEPTANCE GATE

Any fix that only patches one page without a shared primitive fails review.

No exceptions.

## FINAL NOTE

This system is meant to increase revenue, reduce manual labor, and scale operations.
If something feels tacky, clunky, inconsistent, or manual, it is wrong by definition.

Proceed deliberately.
Do not rush.
Do not shortcut.

---

**Last Updated:** [Current Date]
**Status:** ACTIVE - Canonical Reference

