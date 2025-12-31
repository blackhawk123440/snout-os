SNOUT OS V6 MASTER DOCUMENT  
 Internal Only Nano Suit Upgrade for Snout Services  
 Single business vertical: professional pet sitting operations  
 Status: Canonical specification and single source of truth

1. Prime Directive  
    0.1 This system is for Snout Services only.  
    0.2 Do not build for other businesses right now.  
    0.3 Do not remove or degrade any currently working feature.  
    0.4 The mission is reconstruction, not replacement.  
    0.5 Upgrade each subsystem in place with controlled cutovers, dual run when needed, and rollback paths.  
    0.6 Revenue safety is the top constraint. Any change that risks payment flow, booking creation, sitter assignment, or client messaging must be gated, tested, and deployable behind a flag.

2. What Must Stay Working  
    These are non negotiable invariants.  
    1.1 Booking creation and management remains usable at all times.  
    1.2 Sitter management remains usable at all times.  
    1.3 Client and pet management remains usable at all times.  
    1.4 Automations that currently fire must continue to fire with identical behavior until replaced with a new version that is proven equivalent.  
    1.5 Messaging integration that currently works stays working.  
    1.6 Payment link creation stays working.  
    1.7 All dashboards that exist remain accessible to authorized users, with the same data visible, while auth walls are added.  
    1.8 No data loss. All historic bookings, clients, pets, sitters, payments, messages, automation logs remain queryable.

3. Problems This Master Must Fix  
    These are mandatory, explicitly requested.  
    2.1 Automation settings persistence bug  
    When changing automation settings and saving, the settings appear to save but do not actually change in the system until code is edited manually. This must become fully data driven and reliably persisted with verification.  
    2.2 Pricing logic divergence  
    Totals differ across surfaces:  
    • booking form shows one total  
    • calendar shows another  
    • sitter dashboard shows another  
    • other areas show yet another  
    This must be unified into a single pricing engine with a single source of truth, snapshotting, and consistent totals everywhere.  
    2.3 No authentication or authorization walls  
    Anyone with the link can access dashboard, payments, Stripe, automations. This must be locked down with enterprise grade auth and role based access control.  
    2.4 Sitter tiers and sitter dashboards  
    Need tier system and comprehensive sitter portal dashboards with detailed views and restricted data access.  
    2.5 Plug and play automations  
    Owner must be able to comprehend, create, edit, enable, disable automations without code. Automation actions must be real, not stubs.  
    2.6 Reduce owner manual clicks  
    System must minimize admin steps with smart defaults, bulk actions, and automation.  
    2.7 Post payment confirmation message  
    After Stripe payment, client must automatically receive "booking confirmed" messaging.  
    2.8 Form to dashboard wiring duct tape  
    The booking form to dashboard mapping must be made explicit, validated, and migration safe. It is ok to touch this, but must be rollback safe.

4. Product Scope  
    3.1 Single vertical  
    Professional pet sitting operations for Snout Services.  
    3.2 Multi tenant concept stays, but only internal use  
    We keep organization scoping because it enforces isolation and discipline. It also enables future expansion if desired, but no productization requirements.  
    3.3 Subscription model is not a priority  
    If any subscription or Stripe subscription scaffolding exists, it must not drive product decisions. Stripe payment links and invoices remain important.

5. Roles, Portals, and Access  
    4.1 Roles  
    Minimum roles:  
    • Owner  
    • Admin  
    • Manager  
    • Staff  
    • Sitter  
    • Support internal only, optional  
    4.2 Portals  
    • Owner Admin portal  
    • Sitter portal  
    • Client portal optional, only if already present or needed for payment confirmations and booking visibility  
    4.3 Auth requirements  
    • All routes require authentication by default  
    • Public routes are explicit allowlist only, example booking intake form if you choose it to remain public  
    • Every mutation requires permission checks server side  
    • Session inventory, revoke, audit logging  
    • Rate limiting on auth endpoints  
    4.4 Organization context  
    • Every request is executed within an active org context  
    • No implicit default org unless explicitly chosen in spec for single business convenience

6. Canonical Domain Objects  
    These must exist and be the only meaning of truth.  
    5.1 Organization  
    The business container. Internal use but enforced.  
    5.2 Users and memberships  
    User plus membership linking user to org and role, status.  
    5.3 Clients and pets  
    Client, Pet with routines, notes, medication requirements, aggressiveness flags, anxiety flags, species handling.  
    5.4 Sitters  
    Sitter is a user with sitter profile plus capabilities and tier.  
    5.5 Bookings  
    Booking with state machine and status history.  
    5.6 Assignments  
    BookingAssignment with lifecycle.  
    5.7 Line items and pricing snapshot  
    BookingLineItem with pricing snapshot fields, totals computed from snapshot.  
    5.8 Payments  
    Payment objects for payment links, payment status, Stripe references.  
    5.9 Invoices  
    Invoice objects if in system.  
    5.10 Automations  
    Automation definitions, triggers, conditions, actions, versions.  
    5.11 Message log  
    All outbound communication logged with status, provider metadata.  
    5.12 Event log and audit log  
    Every critical action produces an immutable event entry.

7. The "Nano Suit" Architecture  
    This is how the upgraded system is structured.  
    6.1 Single source of truth principle  
    Any business rule must exist in exactly one place and be consumed everywhere else.  
    6.2 Service layer boundary  
    UI never implements business logic directly.  
    All business logic lives in services and is called by API routes.  
    6.3 Validation boundary  
    Every input validated by shared schemas at API boundary and at service boundary.  
    6.4 Org scoping everywhere  
    Every data query and mutation is org scoped and proven with tests.  
    6.5 State machines for critical lifecycles  
    Booking status transitions enforced by code.  
    Assignment lifecycle enforced by code.  
    Automation enable disable enforced by code.  
    Dunning or subscription state only if used.  
    6.6 Snapshots for commercial truth  
    Pricing snapshot stored at time of sale.  
    Changes to service types never rewrite history.

8. The Upgraded Feature List  
    This is the feature inventory that will exist when the nano suit upgrade is complete.  
    This list is what you asked for before asking for the full doc. Here it is.

7.1 Security and Access  
 • Authentication for all dashboards and APIs  
 • Role based permissions matrix enforced server side  
 • Org context enforcement on every request  
 • Session inventory and revoke  
 • Rate limiting on auth and sensitive endpoints  
 • Audit log for auth, org, pricing changes, automation changes, payments, refunds, sensitive exports  
 • Impersonation optional for support role with audit trail

7.2 Booking and Operations  
 • Booking creation, edit, cancellation with state machine enforcement  
 • Booking status history timeline  
 • Assignment binding of sitters and resources  
 • Multi sitter assignments if needed  
 • Booking line items  
 • Booking totals auto recalculated from line items  
 • Invoice linkage with strict rules  
 • Calendar views that reflect canonical booking totals and state

7.3 Pricing Engine Single Source of Truth  
 • One pricing engine service used by:  
 • booking form quote  
 • admin dashboard totals  
 • calendar totals  
 • sitter payout view totals  
 • invoices and payment links  
 • Pricing inputs are explicit:  
 • service base price  
 • time based rules  
 • frequency rules  
 • multi pet modifiers  
 • add ons  
 • fees  
 • discounts  
 • taxes if used  
 • Output is deterministic and versioned  
 • Pricing snapshot is stored at booking creation and updated only by explicit reprice action  
 • Reprice action requires confirmation and logs before after diff

7.4 Automations System Plug and Play  
 • Automation center UI to create and edit automations without code  
 • Automation definitions are versioned  
 • Saving automation settings actually persists and is verifiable  
 • Triggers:  
 • booking created  
 • booking confirmed  
 • payment succeeded  
 • booking status changed  
 • sitter assigned  
 • upcoming booking reminder  
 • post visit followup  
 • review request  
 • Conditions:  
 • service type  
 • client tags  
 • pet flags  
 • booking value threshold  
 • time windows  
 • sitter tier  
 • Action types must be real and production safe:  
 • send SMS  
 • send email if enabled  
 • create task  
 • add fee  
 • apply discount  
 • assign sitter  
 • request review  
 • notify owner  
 • Auto confirm message after Stripe payment is a first class automation and also a hard requirement

7.5 Owner Admin UX and Workflow Reduction  
 • Bulk actions for common flows  
 • Default templates for common automations  
 • One click booking confirm pipeline  
 • Prebuilt playbooks:  
 • new client onboarding  
 • first booking confirmation  
 • day before reminder  
 • day of reminder  
 • post service followup  
 • review request  
 • Exception handling queue:  
 • missing key  
 • missed booking  
 • late sitter check in  
 • unresponsive client  
 • Payment failures if relevant

7.6 Sitter Tiers and Sitter Portal  
 • Tier model:  
 • probation  
 • active  
 • elite  
 • Tier affects:  
 • eligible assignments  
 • payout rate or split  
 • visibility of jobs  
 • required checklists  
 • Performance tracking  
 • Sitter dashboard includes:  
 • upcoming jobs  
 • job details limited to their assignments  
 • client notes and pet routines relevant to job only  
 • check in and check out workflow  
 • required photo or note uploads  
 • incident reporting  
 • earnings view based on canonical pricing snapshot and payout rules  
 • availability input  
 • reliability stats and scorecards

7.7 Data Integrity and Observability  
 • Event logging for all critical flows  
 • Background jobs for reconciliation and automation execution if needed  
 • Redis queue for jobs with prefix isolation  
 • Health endpoint truthfully reports DB and Redis  
 • Proof scripts for critical invariants

7.8 Migration and Backward Compatibility  
 • Dual read and dual write when needed during cutover  
 • Feature flags for routing a surface to new engine versus old logic  
 • Migration scripts are idempotent  
 • No destructive migrations without backups and rollback plan  
 • Post migration verification checklist

8. Hard Rules for Reconstruction Without Breaking Revenue  
    8.1 Every subsystem upgrade follows this pattern  
    • Identify current behavior exactly  
    • Build new module behind a feature flag  
    • Run in shadow mode, compare outputs  
    • Switch one surface at a time  
    • Log diffs  
    • Keep rollback switch  
    8.2 Pricing upgrade rule  
    • Pricing engine must be introduced as read only first  
    • Compare old totals and new totals, log differences  
    • Only after parity do we cut over the booking form quote  
    • Snapshot fields ensure no retroactive changes  
    8.3 Automations upgrade rule  
    • Automation persistence bug must be fixed by building authoritative storage and execution logs  
    • Old automations keep running until new ones are proven equivalent  
    8.4 Auth upgrade rule  
    • Add auth walls with allowlist exemptions for any truly public intake pages  
    • Verify no admin endpoints are reachable unauthenticated  
    • Verify role checks on all mutations

9. Reconstruction Spine  
    This replaces the old "Phase Zero" concept for your legacy dashboard upgrade.  
    It is a controlled reconstruction sequence with gates.

9.1 Gate A Baseline Truth  
 Goal: know exactly what exists today, without guessing.  
 Deliverables:  
 • Forensic audit report of current codebase  
 • Inventory of routes and pages  
 • Inventory of automation types and which are stubs  
 • Inventory of pricing calculations and where used  
 • Data model map and which tables are authoritative  
 Pass criteria:  
 • We can list every feature that exists and where it lives  
 • We can run a baseline end to end booking flow and payment link flow

9.2 Gate B Security Containment  
 Goal: stop public access risk immediately without breaking operations.  
 Deliverables:  
 • Auth system  
 • Permissions matrix  
 • Org context  
 • Middleware protection  
 • Admin routes locked  
 • Sitter portal locked to sitters  
 Pass criteria:  
 • No dashboard or admin endpoint accessible without login  
 • Role based enforcement proven by tests

9.3 Gate C Pricing Unification  
 Goal: one pricing engine and one snapshot.  
 Deliverables:  
 • PricingEngine service  
 • BookingLineItem snapshot enforcement  
 • "Quote" endpoint for booking form uses engine  
 • All surfaces pull totals from same canonical place  
 Pass criteria:  
 • Booking form, calendar, sitter dashboard show identical totals for same booking  
 • Snapshots preserve historic truth

9.4 Gate D Automation Reliability  
 Goal: automation settings actually persist and execution is observable.  
 Deliverables:  
 • Automation storage, versioning, enable disable  
 • Automation builder UI  
 • Execution logs  
 • Plug and play templates  
 • Payment succeeded confirmation automation guaranteed  
 Pass criteria:  
 • Change automation setting, save, verify by read back and by real behavior  
 • Automation execution logs show each run and outcome

9.5 Gate E Sitter Tiers and Portal Upgrade  
 Goal: sitter experience enterprise grade and safe.  
 Deliverables:  
 • Tier model  
 • Tier enforcement on assignments  
 • Comprehensive sitter dashboard  
 • Earnings view based on snapshots  
 Pass criteria:  
 • Sitters only see what they are allowed to see  
 • Tier rules enforced server side

9.6 Gate F Workflow Reduction  
 Goal: owner clicks reduced.  
 Deliverables:  
 • Bulk actions  
 • Default playbooks  
 • Exception queue  
 Pass criteria:  
 • Measurable reduction in manual steps for top 10 workflows

9.7 Gate G Form to Dashboard Wiring Reconstruction  
 Goal: remove duct tape.  
 Deliverables:  
 • Explicit mapping contract for each form field to domain object  
 • Validation on intake  
 • Migration safe changes  
 Pass criteria:  
 • Every field mapped, validated, and tested  
 • No booking created with partial or inconsistent data

10. Acceptance Tests and Proof Scripts  
     10.1 Non negotiable proof targets  
     • Auth wall proof: cannot access admin unauthenticated  
     • Org isolation proof: cross org reads and writes blocked  
     • Pricing parity proof: multiple surfaces match totals  
     • Automation persistence proof: setting change persists and changes behavior  
     • Booking confirmed message proof: payment triggers message  
     • Sitter portal proof: sitter cannot see other sitter or admin data  
     10.2 Every upgrade gate has a proof script  
     If a gate has no proof, it is not done.

11. Cursor Execution Doctrine  
     11.1 Cursor is the executor.  
     11.2 Cursor cannot deviate from this Master without permission.  
     11.3 If something in the code conflicts with this Master, Cursor must:  
     • identify conflict  
     • propose minimal fix  
     • keep rollback safe  
     11.4 Stability rule  
     Fix existential blockers immediately.  
     Log non existential issues and continue forward.

12. Immediate Next Moves  
     Based on where you are right now, your next move is:  
     12.1 Paste this Master into Cursor as the new canonical spec.  
     12.2 Have Cursor generate a "Baseline Truth" audit against your real current dashboard repo.  
     12.3 Start Gate B Security Containment first because you are currently exposed.  
     12.4 Only after auth walls exist do we touch pricing and automations deeper.

13. What You Need From Me Right Now  
     You asked "what do I need right now" and "should I paste into Cursor".  
     Yes.

Do this sequence:  
 13.1 Put this Master into your repo as SNOUT OS INTERNAL MASTER, then paste it to Cursor.  
 13.2 Run Cursor on Gate A Baseline Truth for your current dashboard system repository, not the V6 greenfield repo, unless you explicitly choose to merge them.  
 13.3 Then run Gate B Security Containment.

