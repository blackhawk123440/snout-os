# SNOUT OS INTERNAL MASTER DOC
## Nano Suit Upgrade, Vertical: Professional Pet Sitting

## Non negotiables
0.1 This system is internal only for Snout Services. Multi tenant architecture remains because it protects data separation and future expansion, but external SaaS packaging is not a priority.
0.2 Revenue safety beats refactor purity. No breaking changes to booking intake, payment link flow, existing dashboards, sitter ops, or client ops.
0.3 No big bang rewrite. Every upgrade is a swap. Remove one weak piece, replace with one stronger piece, verify, then proceed.
0.4 Every risky change ships behind a feature flag default false with instant rollback.
0.5 Every gate has proofs. If proof fails, stop and fix, no "we will fix later" for security and money truth.

## Current reality assumptions
1.1 There is an existing dashboard and booking form that already runs Snout Services today.
1.2 The current system has known problems:
1.2.1 Automation settings do not persist when saved, so the UI lies.
1.2.2 Pricing logic diverges across surfaces, form, calendar, sitter dashboard, scripts.
1.2.3 Security is currently exposed unless Gate B protections are enabled and verified.
1.2.4 Sitter tiers and sitter dashboards are incomplete.
1.2.5 Owner still must click too much for routine workflows.
1.2.6 No automatic booking confirmed message after Stripe payment success.
1.2.7 Booking form to dashboard wiring has duct tape risk, fields may be wrong, mapping uncertain.
1.3 Phase Zero capabilities exist and are available as building blocks:
1.3.1 Auth, org and membership, permissions matrix
1.3.2 Zod validation shared layer
1.3.3 Strict env validation
1.3.4 Redis queue, cache, rate limiting, worker model
1.3.5 Billing and entitlements exist, but are optional for internal only use

## Objectives
2.1 Keep everything working and make it feel enterprise grade, organized, color consistent, automation driven, and reliable.
2.2 Make pricing and payments commercially truthful across every surface.
2.3 Make security real with minimal friction.
2.4 Give sitters a real system, tiers, dashboards, and controlled access.
2.5 Reduce owner manual work by turning repeatable steps into automations and one click flows.
2.6 Make the booking intake and fulfillment pipeline deterministic, auditable, and testable.

## Core domains
3.1 Organization and identity
3.1.1 Organizations represent the business context. For now there is one production org, but architecture stays org scoped.
3.1.2 Membership roles supported: owner, admin, manager, staff, sitter, support.
3.1.3 Active org context required for protected surfaces and mutations.

3.2 Clients and pets
3.2.1 Client holds contact and billing preferences.
3.2.2 Pet profiles include routines, meds, behavior flags, vet info, emergency contacts.
3.2.3 Access instructions, key custody, home notes are first class and secure.

3.3 Bookings
3.3.1 Booking state machine is authoritative. Invalid transitions are rejected server side.
3.3.2 Booking contains line items and pricing snapshot. Totals are derived, not manually edited without audit trail.
3.3.3 Booking status history is immutable and stored.

3.4 Assignments
3.4.1 Booking assignments bind sitters to bookings with lifecycle.
3.4.2 Constraints:
3.4.2.1 Must be same org
3.4.2.2 Cannot assign cancelled or completed bookings
3.4.2.3 Must be eligible role and active membership

3.5 Pricing
3.5.1 There is exactly one pricing engine module that produces a canonical pricing breakdown.
3.5.2 All surfaces call the same engine or read the same stored snapshot output.
3.5.3 Pricing snapshots are frozen at booking confirmation, with controlled reprice rules.

3.6 Payments
3.6.1 Stripe payment links must bind to booking and client.
3.6.2 Payment success triggers booking confirmed automation.
3.6.3 Payment status is authoritative, derived from Stripe webhooks with idempotency.

3.7 Automations
3.7.1 Automation settings must persist and be the source of truth.
3.7.2 Automation execution must be durable and observable.
3.7.3 No stubs are allowed in production paths. Incomplete actions must be hidden or blocked by capability flags.

3.8 Messaging
3.8.1 Messages are sent via OpenPhone or selected provider.
3.8.2 Messages have templates, personalization, and an audit trail.
3.8.3 Sitter and client messaging permissions are scoped.

## Security model
4.1 Public surfaces that remain public
4.1.1 Booking intake endpoints and booking form page
4.1.2 Stripe webhook endpoints
4.1.3 SMS provider webhook endpoints
4.1.4 Health endpoint
4.1.5 Tip payment pages if used

4.2 Protected surfaces
4.2.1 All dashboards
4.2.2 All settings, automation settings, pricing settings
4.2.3 All payments and Stripe configuration screens
4.2.4 All admin APIs
4.2.5 All exports and reports

4.3 Enforcement requirements
4.3.1 Middleware enforces auth on protected surfaces when enabled
4.3.2 API enforcement requires session and permission for every mutation
4.3.3 Webhook validation must be enabled in production
4.3.4 Audit logging required for permission denied attempts

## Pricing system design
5.1 Canonical pricing breakdown schema
5.1.1 Subtotal base services
5.1.2 Add ons
5.1.3 Fees
5.1.4 Discounts
5.1.5 Taxes if applicable
5.1.6 Total
5.1.7 Metadata, service codes, durations, quantities, policy flags

5.2 Single source of truth rules
5.2.1 The booking stores pricingSnapshot which is the canonical output.
5.2.2 Surfaces display pricingSnapshot by default.
5.2.3 Recompute is allowed only on draft or requested statuses, or via explicit owner override.
5.2.4 Any override writes an audit entry and stores both before and after.

5.3 Pricing drift detection
5.3.1 A reconciliation job compares stored snapshot totals with recompute totals and flags drift.
5.3.2 Drift never silently changes client charges, it produces an exception task.

## Automation system design
6.1 Automation settings persistence
6.1.1 The settings UI writes to a single canonical table.
6.1.2 The API returns the saved record, then re reads from DB to confirm write succeeded.
6.1.3 A settings checksum is stored so the UI can detect stale state.

6.2 Automation execution
6.2.1 Triggers produce durable jobs in Redis queue
6.2.2 Worker processes jobs with retries, backoff, and idempotency keys
6.2.3 Each automation run writes an EventLog record with inputs, outputs, and errors
6.2.4 Dry run mode simulates without sending messages

6.3 Plug and play automations
6.3.1 Template library, booking confirmed, payment failed, arrival, departure, review request, sitter assignment, key pickup reminder
6.3.2 Conditions builder, booking status, service type, client tags, sitter tier, payment status, time windows
6.3.3 Action library complete set, send SMS, send email optional, create task, add fee, apply discount, change status, notify sitter, notify owner, schedule follow up

## Sitter system design
7.1 Sitter roles and access
7.1.1 Sitters can see only their assigned bookings and limited client data required to do the job
7.1.2 Sitters cannot see payments, pricing settings, global automation settings, or other sitters data
7.1.3 Sitter messaging is allowed only in contexts tied to assignments

7.2 Sitter tiers
7.2.1 Tier definitions, probation, active, elite, specialist, lead
7.2.2 Tier rules, pay split, eligibility for complex routines, service types
7.2.3 Performance gates, no shows, lateness, client ratings, incident reports

7.3 Sitter dashboard
7.3.1 Schedule and route view
7.3.2 Booking details with checklist, meds, notes, photos
7.3.3 Earnings and payouts view
7.3.4 Training and tier progress
7.3.5 Tasks and exceptions

## Owner operations cockpit
8.1 Today board
8.1.1 Bookings starting today
8.1.2 Unassigned bookings
8.1.3 Unpaid bookings
8.1.4 At risk bookings, missing instructions, sitter issues, payment failures
8.1.5 One click actions, assign sitter, send payment link, resend confirmation, mark complete

8.2 Next 7 days capacity
8.2.1 Sitter utilization
8.2.2 Overbook risk
8.2.3 Hiring triggers

8.3 Client success
8.3.1 Review requests
8.3.2 Churn risk
8.3.3 Repeat booking nudges

## Reliability and observability
9.1 Health endpoint is truthful
9.1.1 DB connected
9.1.2 Redis connected
9.1.3 Queue connected
9.1.4 Worker heartbeat and last processed job timestamp
9.1.5 Webhook signature validation status

9.2 Error handling
9.2.1 Every critical mutation is try caught and logs an EventLog error entry
9.2.2 No silent failures on automation execution

## Data migration and compatibility
10.1 Existing bookings, clients, sitters must remain usable throughout.
10.2 When models change, write migrations that preserve old fields until new fields are verified in production.
10.3 Use backfills with idempotent jobs, never manual one time scripts without logging.

## Release gates
11.1 Gate A Baseline Truth must remain updated when major modules change.
11.2 Gate B Security Containment must be enabled and verified before any expansion of surfaces.
11.3 Money truth gate:
11.3.1 Pricing engine is single source of truth and passes parity tests across all surfaces
11.3.2 Payment webhooks validated and idempotent
11.3.3 Booking confirmed automation proven

## Epics 11 through 13, internal nano suit rebuild
12.1 Epic 11, Backbone reconstruction without visual breakage
12.1.1 Freeze current UI routes and map every form field to DB fields
12.1.2 Add typed form to dashboard mapping layer with tests
12.1.3 Implement canonical pricing engine and force every surface to use it behind a flag
12.1.4 Implement automation settings persistence fix with checksum and reread validation
12.1.5 Add worker heartbeat and automation run ledger

12.2 Epic 12, Security and roles expansion for real ops
12.2.1 Enable auth protection in staged rollout with allowlist intact
12.2.2 Enforce permission matrix across admin mutations
12.2.3 Build sitter auth and sitter scoped dashboard
12.2.4 Validate webhooks and lock down secrets
12.2.5 Add session inventory, revoke, impersonation, audit reporting

12.3 Epic 13, Operations excellence and owner click reduction
12.3.1 Booking confirmed message automation on Stripe payment success
12.3.2 One click owner actions and exception queue
12.3.3 Sitter tiers and earnings logic
12.3.4 Automation templates library, plug and play UX
12.3.5 Pricing drift reconciliation and exception reporting

## Definition of done for the nano suit upgrade
13.1 Zero revenue breakage during rollout
13.2 Automation settings persist and execution is traceable end to end
13.3 Pricing matches everywhere and is snapshot truthful
13.4 Dashboard is protected, booking intake remains public
13.5 Sitter dashboards exist and are properly scoped
13.6 Owner daily workload reduced via one click flows and automations
13.7 Proof scripts pass and monitoring is in place

## Reconstruction sequence, revenue safe, step by step

### Phase 1, truth and wiring first, no behavior change

**Inventory every booking form field and dashboard field, map to DB, document mismatch**

**Add a mapping layer that translates form payloads into canonical booking create inputs**

**Add tests that submit a known payload and assert the booking record fields match expected values**

**Add logging on booking creation that records the mapping version used**

### Phase 2, pricing unification behind a flag

**Implement PricingEngine v1 that outputs the canonical pricing breakdown**

**Add a PricingParity harness that computes totals using old paths and new engine, logs differences, does not change charges**

**Add a feature flag USE_PRICING_ENGINE_V1 default false**

**Switch one surface at a time to display pricingSnapshot from the engine when flag true, start with internal admin view**

**When parity reaches acceptable zero drift for a week, flip the flag for all surfaces**

### Phase 3, automation persistence and execution truth

**Fix automation settings persistence as a hard requirement, save, reread, checksum, return canonical value**

**Add an automation run ledger page that shows last runs and failures**

**Move every automation execution to the worker queue**

**Replace stubs with either real implementations or remove them from UI until implemented**

### Phase 4, secure the system without breaking booking intake

**Confirm allowlist is correct**

**Create admin user**

**Enable auth flag in staging, verify redirects only on protected routes**

**Enable in production during low traffic**

**Enable permission checks**

**Enable webhook validation**

### Phase 5, sitter tiers and dashboards

**Build sitter scoped dashboard with only assigned booking access**

**Implement tiers and eligibility rules**

**Add earnings view and payout reporting**

### Phase 6, owner click reduction and confirmations

**Implement booking confirmed message on Stripe payment success**

**Add one click actions in Today board**

**Add exception queue for unpaid, unassigned, drift, automation failures**

## What you need right now

**Paste the master document above into Cursor as the new canonical internal master spec for Epics 11 to 13.**

**Tell Cursor to start at Phase 1 of the reconstruction sequence, specifically the form to dashboard wiring map, because that is your biggest revenue risk and the hardest to see.**

**Keep all risky work behind flags and ship in tiny swaps.**
