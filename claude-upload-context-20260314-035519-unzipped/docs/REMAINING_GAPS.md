# Snout OS — Remaining Gaps (Post-Hardening)

Commit: af2d0169f2d1a3467abe6c079a4ec1d4ed652a57

This document lists ONLY real, remaining gaps.
If it is not listed here, it is considered implemented.

---

# 1. Scheduling Engine Gaps (HIGH IMPACT)

## 1.1 True Recurring Availability Engine

Current:
- Basic availability.
- Google busy import optional.
- No full recurring rule engine.

Missing:
- Recurring availability rules (RRULE-style).
- Merge logic between:
  - Sitter availability
  - Existing bookings
  - Google busy blocks
- Deterministic conflict detection before booking confirmation.
- Admin override flow.

Impact:
Double-booking risk.

Priority: HIGH  
Difficulty: HARD

---

## 1.2 Calendar is One-Way Only

Current:
- Snout OS → Google sync.
- Repair tool.
- Checksum idempotency.
- Dead-letter handling.

Missing:
- Google → Snout OS ingestion.
- Conflict resolution when Google events change.
- Explicit policy for external edits.

Priority: MEDIUM  
Difficulty: HARD

---

# 2. Money System Gaps

## 2.1 Stripe Connect Payouts

Current:
- Charges + refunds persisted.
- Owner + client payment visibility.

Missing:
- Stripe Connect onboarding.
- Sitter payout linking.
- Earnings dashboard.
- Transfer reconciliation.
- Instant payout support.

Priority: HIGH (if marketplace model)  
Difficulty: HARD

---

## 2.2 Ledger-Grade Reconciliation

Missing:
- Internal ledger table.
- Stripe vs DB reconciliation job.
- Financial audit export.

Priority: MEDIUM  
Difficulty: HARD

---

# 3. AI Productization Gaps

## 3.1 AI Governance Layer

Missing:
- Per-org AI toggle.
- AI quotas / budget caps.
- Prompt versioning.
- AI audit log.
- Cost tracking per org.
- Admin AI controls.

Priority: MEDIUM  
Difficulty: HARD

---

## 3.2 AI Features Not Implemented

- Dynamic pricing suggestions.
- Sentiment analysis.
- Predictive alerts.

Priority: LOW–MEDIUM  
Difficulty: HARD

---

# 4. Automations Worker Architecture Gap

Current:
- BullMQ queues.
- Dead-letter handling.

Gap:
- automation-worker.ts still performs global scanning.
- Not fully event-driven per org.
- Not horizontally scalable.

Missing:
- Fully queue-driven reminder generation.
- Removal of interval-based scanning.

Priority: MEDIUM  
Difficulty: MEDIUM–HARD

---

# 5. Compliance & Data Rights

## 5.1 GDPR / Data Export

Missing:
- Client data export endpoint.
- Admin-triggered export.
- Delete-account flow.

Priority: MEDIUM  
Difficulty: MEDIUM

---

# 6. Client Portal QA Gaps

- Session must always include clientId.
- Cross-client isolation tests for all endpoints.
- Clean 403 for missing clientId.
- Role casing consistency.

Priority: MEDIUM  
Difficulty: EASY–MEDIUM

---

# 7. Design System Enforcement

Missing:
- Lint rule enforcing UI primitives.
- CI guard preventing raw button/input usage.

Priority: LOW  
Difficulty: EASY

---

# Definition of Operationally Complete

The system is operationally complete when:

- Recurring availability engine exists.
- No global worker scanning risk.
- Client data export exists.
- Stripe Connect payouts exist (if business model requires it).

🔥 Now — Choose the First Hard Kill

We have four real high-level gaps left:

Recurring availability engine

Stripe Connect payouts

Automation worker refactor

AI governance layer

If your business model depends on payouts → Stripe Connect first.

If reliability matters most → Recurring availability engine first.

If safety/scalability matters → Automation worker refactor first.
