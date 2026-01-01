# Master Spec Reconstruction Sequence

**Source**: SNOUT_OS_INTERNAL_MASTER.md Lines 229-292  
**Status**: Execution order per Master Spec

---

## Complete Sequence

### ✅ Phase 1: Form to Dashboard Wiring Map
**Status**: VERIFIED in production  
**Feature Flag**: `ENABLE_FORM_MAPPER_V1` (enabled in production)

---

### 🔄 Phase 2: Pricing Unification (Sprint A)
**Status**: In progress  
**Feature Flag**: `USE_PRICING_ENGINE_V1` (defaults to false)  
**Current Step**: Parity logging verification

---

### Phase 3: Automation Persistence and Execution Truth
**Requirements**:
- Fix automation settings persistence (save, reread, checksum, return canonical value)
- Add automation run ledger page
- Move every automation execution to worker queue
- Replace stubs with real implementations or remove from UI

**Note**: Code exists, requires verification

---

### Phase 4: Secure the System Without Breaking Booking Intake (Gate B)
**Requirements**:
- Confirm allowlist is correct
- Create admin user
- Enable auth flag in staging, verify redirects only on protected routes
- Enable in production during low traffic
- Enable permission checks
- Enable webhook validation

**Feature Flags**:
- `ENABLE_AUTH_PROTECTION` (defaults to false)
- `ENABLE_PERMISSION_CHECKS` (defaults to false)
- `ENABLE_WEBHOOK_VALIDATION` (defaults to false)

**Note**: Code exists, flags default to false (safe)

---

### Phase 5: Sitter Tiers and Dashboards
**Requirements**:
- Build sitter scoped dashboard with only assigned booking access
- Implement tiers and eligibility rules
- Add earnings view and payout reporting

**Feature Flag**: `ENABLE_SITTER_AUTH` (defaults to false)

**Note**: Code exists, requires verification

---

### Phase 6: Owner Click Reduction and Confirmations
**Requirements**:
- Implement booking confirmed message on Stripe payment success
- Add one click actions in Today board
- Add exception queue for unpaid, unassigned, drift, automation failures

**Note**: Code exists, requires verification

---

## After All Phases Complete

### Deviation Backlog Items

**Per DEVIATION_BACKLOG.md, priority order**:

1. **Sprint C**: Conditions Builder UI + Action Library Core
   - Conditions Builder UI
   - Action Library: Fee, Discount, Status Change

2. **Sprint D**: Arrival/Departure Events + Templates
   - Arrival Event Support + Template
   - Departure Event Support + Template
   - Key Pickup Reminder Alignment

3. **Sprint E**: Impersonation
   - Impersonation with Audit Trail

4. **Future**: Email Action (Optional)

---

## Your Listed Sequence vs Master Spec

**Your List**:
1. ✅ Phase 1 (live)
2. 🔄 Pricing Unification (Sprint A) - **CURRENT**
3. Automation settings persistence
4. Gate B security enablement
5. Sitter tiers and dashboards
6. Deviation backlog items

**Master Spec Sequence**:
1. ✅ Phase 1 (live)
2. 🔄 Phase 2: Pricing Unification (Sprint A) - **CURRENT**
3. Phase 3: Automation persistence
4. Phase 4: Gate B security
5. Phase 5: Sitter tiers
6. **Phase 6: Owner Click Reduction** ← **MISSING FROM YOUR LIST**
7. Deviation backlog items

---

## What Comes After Your List

**Missing from your list**: **Phase 6: Owner Click Reduction and Confirmations**

After Phase 5 (Sitter Tiers), the Master Spec requires **Phase 6** before moving to deviation backlog items.

**Phase 6 includes**:
- Booking confirmed message on Stripe payment success
- One click actions in Today board
- Exception queue for unpaid, unassigned, drift, automation failures

---

## Corrected Complete Sequence

1. ✅ **Phase 1**: Form to Dashboard Wiring Map (VERIFIED)
2. 🔄 **Phase 2**: Pricing Unification (Sprint A) - IN PROGRESS
3. **Phase 3**: Automation Persistence
4. **Phase 4**: Gate B Security Enablement
5. **Phase 5**: Sitter Tiers and Dashboards
6. **Phase 6**: Owner Click Reduction ← **THIS COMES NEXT**
7. **Deviation Backlog Items** (Sprints C, D, E, Future)

---

**Last Updated**: 2024-12-30  
**Source**: SNOUT_OS_INTERNAL_MASTER.md Lines 229-292

