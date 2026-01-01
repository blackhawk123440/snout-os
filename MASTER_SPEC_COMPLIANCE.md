# Master Spec Compliance Document

**Canonical Source**: `SNOUT_OS_INTERNAL_MASTER.md`

This document tracks implementation status against the master specification. Every requirement must be implemented exactly as specified, with no deviations, shortcuts, or "backtunnels."

## Implementation Status

### Phase 1: Truth and Wiring First ✅ COMPLETE

**Master Spec Lines 231-239**:

1. ✅ **"Inventory every booking form field and dashboard field, map to DB, document mismatch"**
   - Deliverable: `PHASE_1_FORM_TO_DB_MAPPING.md`
   - Status: Complete with full field-by-field mapping

2. ✅ **"Add a mapping layer that translates form payloads into canonical booking create inputs"**
   - Deliverable: `src/lib/form-to-booking-mapper.ts`
   - Status: Complete with explicit precedence rules

3. ✅ **"Add tests that submit a known payload and assert the booking record fields match expected values"**
   - Deliverables: `src/lib/__tests__/form-to-booking-mapper.test.ts`, `src/app/api/__tests__/form-route-integration.test.ts`
   - Status: Complete, 27 tests passing

4. ✅ **"Add logging on booking creation that records the mapping version used"**
   - Deliverable: Mapping report logging in form route
   - Status: Complete with version tracking and PII redaction

**Non-Negotiables Compliance**:
- ✅ 0.1: Internal only (no external SaaS changes)
- ✅ 0.2: Revenue safety (flag defaults false, no breaking changes)
- ✅ 0.3: No big bang rewrite (single swap, existing code preserved)
- ✅ 0.4: Feature flags default false (`ENABLE_FORM_MAPPER_V1` defaults to false)
- ✅ 0.5: Proofs required (tests passing, verification checklist)

**Current Status**: Phase 1 code complete, awaiting staging/production verification

---

### Phase 2: Pricing Unification ⏳ NOT STARTED

**Master Spec Lines 241-251**:

**Requirement 1**: "Implement PricingEngine v1 that outputs the canonical pricing breakdown"

**Requirement 2**: "Add a PricingParity harness that computes totals using old paths and new engine, logs differences, does not change charges"

**Requirement 3**: "Add a feature flag USE_PRICING_ENGINE_V1 default false"

**Requirement 4**: "Switch one surface at a time to display pricingSnapshot from the engine when flag true, start with internal admin view"

**Requirement 5**: "When parity reaches acceptable zero drift for a week, flip the flag for all surfaces"

**Status**: ⏳ Awaiting Phase 1 verification before starting

**Pricing System Design Requirements (Lines 5.1-5.3)**:
- 5.1.1-5.1.7: Canonical pricing breakdown schema (Subtotal, Add ons, Fees, Discounts, Taxes, Total, Metadata)
- 5.2.1-5.2.4: Single source of truth rules (pricingSnapshot storage, display rules, reprice rules, audit trail)
- 5.3.1-5.3.2: Pricing drift detection (reconciliation job, exception tasks)

**Current Pricing State** (to be inventoried):
- Pricing logic exists in: `src/lib/rates.ts`, `src/lib/pricing-engine.ts`, `src/lib/booking-utils.ts` (calculatePriceBreakdown)
- Pricing displayed in: Booking form, calendar, booking details, sitter dashboard
- Pricing calculated in: Form submission, booking creation, booking updates

---

### Phase 3: Automation Persistence and Execution Truth ⏳ NOT STARTED

**Master Spec Lines 253-261**:

**Requirement 1**: "Fix automation settings persistence as a hard requirement, save, reread, checksum, return canonical value"

**Requirement 2**: "Add an automation run ledger page that shows last runs and failures"

**Requirement 3**: "Move every automation execution to the worker queue"

**Requirement 4**: "Replace stubs with either real implementations or remove them from UI until implemented"

**Status**: ⏳ Awaiting Phase 2 completion

**Automation System Design Requirements (Lines 6.1-6.3)**:
- 6.1.1-6.1.3: Settings persistence (canonical table, reread validation, checksum)
- 6.2.1-6.2.4: Execution (Redis queue, worker with retries, EventLog, dry run)
- 6.3.1-6.3.3: Plug and play (templates, conditions, complete action library)

---

### Phase 4: Secure the System ⏳ PARTIALLY COMPLETE (Gate B)

**Master Spec Lines 263-275**:

- ✅ "Confirm allowlist is correct" (Gate B Phase 2.1 complete)
- ✅ "Create admin user" (Gate B Phase 2.2 complete)
- ✅ "Enable auth flag in staging, verify redirects only on protected routes" (Gate B Phase 2.2 complete)
- ⏳ "Enable in production during low traffic" (Pending)
- ⏳ "Enable permission checks" (Pending - ENABLE_PERMISSION_CHECKS flag exists but not enforced)
- ⏳ "Enable webhook validation" (Pending - ENABLE_WEBHOOK_VALIDATION flag exists but not enforced)

**Status**: Gate B Phase 2.2 complete, production enablement and permission/webhook enforcement pending

---

### Phase 5: Sitter Tiers and Dashboards ⏳ PARTIALLY COMPLETE

**Master Spec Lines 277-283**:

- ✅ "Build sitter scoped dashboard with only assigned booking access" (Basic sitter dashboard exists)
- ⏳ "Implement tiers and eligibility rules" (Tier models exist, but full implementation pending)
- ⏳ "Add earnings view and payout reporting" (Pending)

**Status**: Basic sitter dashboard exists, tiers and earnings pending full implementation

---

### Phase 6: Owner Click Reduction ⏳ NOT STARTED

**Master Spec Lines 285-291**:

- ⏳ "Implement booking confirmed message on Stripe payment success"
- ⏳ "Add one click actions in Today board"
- ⏳ "Add exception queue for unpaid, unassigned, drift, automation failures"

**Status**: Not started

---

## Execution Rules (From Master Spec)

1. **Revenue Safety First** (0.2): No breaking changes to booking intake, payment links, dashboards
2. **Feature Flags Default False** (0.4): Every risky change behind a flag that defaults to false
3. **Proofs Required** (0.5): Every gate must have proofs. If proof fails, stop and fix
4. **No Big Bang** (0.3): Every upgrade is a swap - remove one weak piece, replace with one stronger piece
5. **Follow Sequence** (Lines 229-291): Phases must be completed in order as specified

## Next Actions

1. **Complete Phase 1 Verification**:
   - Enable in staging
   - Submit 5 test bookings
   - Verify all acceptance criteria
   - Enable in production if staging passes

2. **Begin Phase 2** (only after Phase 1 proven):
   - Inventory current pricing logic locations
   - Design canonical pricing breakdown schema
   - Implement PricingEngine v1
   - Create PricingParity harness
   - Add feature flag
   - Surface-by-surface rollout

## Compliance Status: ✅ PHASE 1 ALIGNED

Phase 1 implementation matches master spec requirements exactly. All non-negotiables followed. Ready for verification and then Phase 2.

