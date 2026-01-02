# Phase 4A Calibration Gate

**Date:** 2025-01-27  
**Status:** Complete  
**Decision:** Increased ATTENTION_DECAY_DURATION from 4000ms to 8000ms

---

## Calibration Evaluation

**Initial Duration:** 4000ms (4 seconds)

**Evaluation Criteria:**
- Does decay feel too fast?
- Does the system feel like it powers down while the user is reading?
- Is the duration appropriate for user reading/scanning patterns?

**Decision:** Increase to 8000ms (8 seconds)

**Rationale:**
- 4 seconds is too fast for typical reading/scanning patterns
- Users scanning content near buttons would experience decay while still actively engaged
- 8 seconds provides enough time for users to finish reading and interact naturally
- System feels like it's settling rather than powering down
- Still fast enough to feel self-regulating, not permanently alert

---

## Change Made

**File:** `src/lib/system-dna.ts`

**Change:**
```typescript
// Before
ATTENTION_DECAY_DURATION: 4000, // 4 seconds - gradual return to silence

// After
ATTENTION_DECAY_DURATION: 8000, // 8 seconds - calibrated to avoid feeling like system powers down while reading
```

**No logic changes:** Only the constant value was adjusted. Decay logic remains unchanged.

---

## Future Considerations

**Posture-Aware Decay (Logged for Phase 4B or Phase 5):**

Different postures might benefit from different decay durations:
- **Observational:** Could use longer decay (10-12 seconds) - users are scanning/observing
- **Analytical:** Current 8 seconds - appropriate for analytical reading
- **Operational:** Could use shorter decay (5-6 seconds) - users are executing tasks quickly
- **Configuration:** Could use longer decay (10+ seconds) - users are configuring, need stability

**Implementation Complexity:** Low - would require passing posture context to Button component or using a context provider. However, this adds complexity without clear benefit at this stage.

**Recommendation:** Keep uniform 8-second duration for now. Consider posture-aware decay in Phase 4B (Progressive Density) or Phase 5 if user feedback indicates it's needed.

---

## Verification

- ✅ Constant updated to 8000ms
- ✅ No decay logic changes
- ✅ Typecheck passes
- ✅ Documentation updated

---

## Calibration Gate Status

**PASS** - 8 seconds provides appropriate balance between self-regulation and user engagement.

