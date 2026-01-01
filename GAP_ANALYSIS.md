# SNOUT OS Master Spec Gap Analysis

**Date**: 2024-12-30  
**Status**: Reconstruction Sequence (Phases 1-6) ✅ COMPLETE  
**Analysis**: Comparison against full master spec feature list

---

## ✅ Reconstruction Sequence: COMPLETE

All 6 phases of the reconstruction sequence have been successfully implemented:

1. ✅ Phase 1: Form to Dashboard Wiring Map
2. ✅ Phase 2: Pricing Unification
3. ✅ Phase 3: Automation Persistence & Execution Truth
4. ✅ Phase 4: Security Containment (code infrastructure)
5. ✅ Phase 5: Sitter Tiers and Dashboards
6. ✅ Phase 6: Owner Click Reduction and Confirmations

---

## 📋 Master Spec Features vs. Implementation

### ✅ Fully Implemented Features

**Foundation & Safety Rails**:
- ✅ Canonical data contracts (Zod validation)
- ✅ Environment validation
- ✅ EventLog audit backbone
- ✅ Feature flags with instant rollback
- ✅ Proof scripts/tests

**Security**:
- ✅ Authentication (NextAuth v5)
- ✅ Route protection with public allowlist
- ✅ Permission matrix framework
- ✅ Sitter access model with scoped views

**Booking System**:
- ✅ Booking creation, editing, cancellation
- ✅ Assignment binding with lifecycle
- ✅ Service line items with pricing snapshot
- ✅ Booking form to dashboard wiring (typed, mapped, verified)
- ✅ Status validation (basic state checking)

**Pricing**:
- ✅ Single pricing engine (v1)
- ✅ Canonical pricing breakdown structure
- ✅ Pricing snapshots locked per booking
- ✅ Parity harness for comparison

**Automations**:
- ✅ Settings persistence with checksum
- ✅ Durable job queue execution
- ✅ Complete action library (no stubs)
- ✅ EventLog trace for runs
- ✅ Automation ledger page

**Sitter System**:
- ✅ Sitter profiles and access control
- ✅ Tier definitions and rules
- ✅ Tier eligibility checking
- ✅ Sitter dashboard (schedule, earnings, tier progress)
- ✅ Scoped messaging and client data access

**Owner Operations**:
- ✅ Today board
- ✅ One-click workflows
- ✅ Exception queue
- ✅ Booking confirmation on payment success

**Payments**:
- ✅ Stripe payment link generation
- ✅ Payment status tracking
- ✅ Auto booking confirmed message on payment success

---

## ⚠️ Features Mentioned in Master Spec but NOT in Reconstruction Sequence

These features are in the master spec's "spine feature list" but were not part of Phases 1-6:

### 1. **Tenant Isolation / Org Scoping** ⚠️ Deferred
- **Master Spec**: Section 3.1.3, Foundation requirements
- **Status**: Not implemented (but master spec notes "for now there is one production org")
- **Priority**: Low (single-tenant for now)
- **Impact**: Multi-tenant architecture exists but org scoping not enforced

### 2. **Admin Impersonation** ❌ Not Implemented
- **Master Spec**: Epic 12.2.5, Section 4.3
- **Status**: Not implemented
- **Priority**: Medium
- **Location**: Should be in `src/lib/auth-helpers.ts` or new `src/lib/impersonation.ts`

### 3. **Session Inventory and Revoke** ❌ Not Implemented
- **Master Spec**: Epic 12.2.5, Section 4.3
- **Status**: Not implemented
- **Priority**: Medium
- **Location**: Should be in `src/app/api/sessions/route.ts` or similar

### 4. **Price Reconciliation Job** ❌ Not Implemented
- **Master Spec**: Section 5.3, Epic 12.3.5
- **Status**: Not implemented
- **Priority**: Medium (for pricing drift detection)
- **Location**: Should be in `src/worker/reconciliation-worker.ts` or similar
- **Note**: Parity harness exists but no scheduled job to detect drift

### 5. **Reprice Rules Enforcement** ⚠️ Partial
- **Master Spec**: Section 5.2.3 "Recompute is allowed only on draft or requested statuses"
- **Status**: Logic not enforced in code
- **Priority**: Medium
- **Location**: Should enforce in booking update routes
- **Current**: Status validation exists but no reprice rule checking

### 6. **Admin Pricing Override Workflow** ❌ Not Implemented
- **Master Spec**: Section 5.2.4 "Any override writes an audit entry"
- **Status**: Not implemented
- **Priority**: Medium
- **Location**: Should be in booking update routes with EventLog audit

### 7. **Booking Status History** ⚠️ Partial
- **Master Spec**: Section 3.3.3 "Booking status history is immutable and stored"
- **Status**: No StatusHistory model or tracking
- **Priority**: Medium
- **Location**: Should be in `prisma/schema.prisma` (StatusHistory model) and booking update routes

### 8. **Formal Booking State Machine** ⚠️ Basic
- **Master Spec**: Section 3.3.1 "Booking state machine with valid transitions only"
- **Status**: Basic status validation exists, but no formal transition rules
- **Priority**: Medium
- **Location**: Should be in `src/lib/booking-state-machine.ts`

### 9. **Webhook Signature Validation** ⚠️ Flag Only
- **Master Spec**: Section 4.3.3, Epic 12.2.4
- **Status**: `ENABLE_WEBHOOK_VALIDATION` flag exists but validation logic not implemented
- **Priority**: High (security requirement)
- **Location**: Should be in `src/app/api/webhooks/stripe/route.ts` and SMS webhook route

### 10. **Invoice Linkage** ❌ Not Implemented
- **Master Spec**: Section 3.3.2 "Invoice linkage rules, one active invoice policy"
- **Status**: No Invoice model in schema
- **Priority**: Low (may not be needed for current operations)
- **Note**: Master spec mentions it but may be deferred

### 11. **Next 7 Days Capacity View** ❌ Not Implemented
- **Master Spec**: Section 8.2
- **Status**: Not implemented
- **Priority**: Low (nice-to-have)
- **Location**: Should be in `src/app/api/capacity/route.ts` and `src/app/capacity/page.tsx`

### 12. **Client Success Metrics** ❌ Not Implemented
- **Master Spec**: Section 8.3 (Review requests, churn risk, repeat booking nudges)
- **Status**: Not implemented
- **Priority**: Low (nice-to-have)
- **Location**: Should be in `src/app/api/client-success/route.ts` and related pages

### 13. **Automation Builder UX** ⚠️ Basic
- **Master Spec**: Section 6.3 (Plug and play automations, templates, toggles, conditions, preview, dry run)
- **Status**: Settings page exists but no visual builder UX
- **Priority**: Low (functionality exists, UX can be enhanced later)

### 14. **Sitter Route View** ⚠️ Not Implemented
- **Master Spec**: Section 7.3.1 "Schedule and route view"
- **Status**: Basic schedule exists but no route optimization view
- **Priority**: Low (nice-to-have)

### 15. **Sitter Checklist Feature** ⚠️ Not Implemented
- **Master Spec**: Section 7.3.2 "Booking details with checklist, meds, notes, photos"
- **Status**: Notes exist but no formal checklist system
- **Priority**: Low (nice-to-have)

---

## 🎯 Priority Classification

### **High Priority** (Security & Money Truth)
1. **Webhook Signature Validation** - Security requirement, flag exists but logic missing
2. **Price Reconciliation Job** - Money truth requirement (drift detection)

### **Medium Priority** (Operational Requirements)
3. **Admin Impersonation** - Admin tooling
4. **Session Inventory/Revoke** - Security and admin tooling
5. **Booking Status History** - Audit trail requirement
6. **Reprice Rules Enforcement** - Pricing integrity
7. **Admin Pricing Override Workflow** - With audit logging
8. **Formal Booking State Machine** - Data integrity

### **Low Priority** (Nice-to-Have / Deferred)
9. Tenant Isolation (deferred - single tenant for now)
10. Invoice Linkage (may not be needed)
11. Next 7 Days Capacity View
12. Client Success Metrics
13. Automation Builder UX enhancements
14. Sitter Route View
15. Sitter Checklist Feature

---

## 📊 Summary

### Reconstruction Sequence Status
✅ **100% COMPLETE** - All 6 phases fully implemented

### Master Spec Coverage
- **Core Reconstruction Sequence**: ✅ 100%
- **Full Master Spec Feature List**: ⚠️ ~80%

### Key Gaps
1. **Security**: Webhook validation logic (flag exists, implementation needed)
2. **Money Truth**: Price reconciliation job (drift detection)
3. **Audit Trail**: Status history, pricing override audit workflow
4. **Admin Tooling**: Impersonation, session management
5. **Nice-to-Have**: Capacity views, client success metrics, route optimization

---

## ✅ Conclusion

**The reconstruction sequence (Phases 1-6) is 100% complete** as specified. All core revenue-safe, security-focused, and operational improvements have been implemented.

**Additional features** from the master spec's full feature list that weren't part of the reconstruction sequence remain unimplemented. These are either:
- Deferred (tenant isolation - single tenant for now)
- Nice-to-have enhancements (capacity views, route optimization)
- Missing security/audit features that should be addressed (webhook validation, status history, price reconciliation)

**Recommendation**: The system is production-ready for the reconstruction sequence goals. Additional features can be prioritized and implemented in future phases based on operational needs.

---

## 🚀 Next Steps (If Desired)

1. **Immediate Security**: Implement webhook signature validation
2. **Money Truth**: Add price reconciliation job
3. **Audit Trail**: Add booking status history
4. **Admin Tooling**: Add impersonation and session management
5. **Enhancements**: Add capacity views and client success metrics

**All changes should continue to follow the same pattern**: Feature flags, backward compatibility, incremental rollout.

