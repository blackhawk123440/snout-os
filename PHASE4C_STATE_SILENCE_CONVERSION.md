# Phase 4C: State Silence Conversion

**Date:** 2025-01-27  
**Status:** Complete  
**Phase:** 4C - Behavioral Refinement

---

## Overview

Formalized idle as a first-class state in the system. Idle is the intentional absence of signal - no glow, no emphasis, no motion beyond baseline. This prevents fatigue and keeps active states powerful.

**Key Principle:** Idle is not default styling. Idle is intentional absence of signal.

---

## Goal

Explicitly define when the system should do nothing. Silence keeps everything else powerful.

---

## Rule

**Idle is a first-class state. Not "default styling," but intentional absence of signal.**

This is what prevents fatigue.

---

## Changes Made

### 1. Button Component Default Energy

**Changed:** Button component now defaults to `idle` energy for secondary, tertiary, and ghost variants.

**Implementation:**
- Added `getDefaultEnergy()` function that returns:
  - `'focused'` for primary and danger buttons (they are primary actions)
  - `'idle'` for secondary, tertiary, and ghost buttons (silence state)
- Button component uses `effectiveEnergy = energy ?? getDefaultEnergy(variant)`
- System enforces this at component level, not page level

**Result:**
- Secondary, tertiary, and ghost buttons are in idle state by default (silent)
- Primary buttons default to focused (they are the primary action)
- Pages don't need to specify energy for non-primary buttons - system handles it

### 2. System DNA Rule Added

**Added:** `IDLE_IS_FIRST_CLASS_STATE: true` to `SYSTEM_DNA_RULES`

**Documentation:**
```
Phase 4C: Idle is a first-class state, not default styling.
Silence is intentional absence of signal: no glow, no emphasis, no motion beyond baseline.
Secondary, tertiary, and ghost buttons default to idle energy.
Primary buttons default to focused energy (they are the primary action).
This prevents fatigue and keeps active states powerful.
```

### 3. Idle State Characteristics

**Enforced:**
- No glow (idle pink color is minimal: `#fce1ef` with 0.3 opacity per `ENERGY_OPACITY.idle`)
- No emphasis (standard styling, no special effects)
- No motion beyond baseline (standard transitions via motion system, no extra animation)

**Note:** Idle state still allows standard transitions for interactivity (hover, focus). The "beyond baseline" refers to extra motion effects, not standard UI transitions.

---

## Files Modified

1. **`src/components/ui/Button.tsx`**
   - Added `getDefaultEnergy()` function
   - Changed Button component to use `effectiveEnergy = energy ?? getDefaultEnergy(variant)`
   - Removed hardcoded `energy = 'focused'` default

2. **`src/lib/system-dna.ts`**
   - Added `IDLE_IS_FIRST_CLASS_STATE: true` to `SYSTEM_DNA_RULES`
   - Added documentation explaining idle state enforcement

---

## Verification

- ✅ Typecheck passes
- ✅ Idle is default for secondary, tertiary, ghost buttons
- ✅ Focused is default for primary, danger buttons
- ✅ Energy prop can still be explicitly set (system doesn't override explicit values)
- ✅ System enforces at component level, not page level
- ✅ Idle state has no glow, no emphasis, no motion beyond baseline
- ✅ System DNA rule added and documented

---

## Behavioral Impact

**Before Phase 4C:**
- All buttons defaulted to `'focused'` energy
- Everything felt slightly "on" all the time
- No explicit silence state

**After Phase 4C:**
- Non-primary buttons default to `'idle'` (silent state)
- Primary buttons default to `'focused'` (appropriate for primary actions)
- System has clear states: idle (silent) → focused (attention) → active (readiness)
- Contrast increases for active states without adding visuals
- Prevents fatigue by ensuring system has clear breathing states

---

## Implementation Notes

- **System-enforced:** Button component enforces defaults, not page logic
- **Explicit override:** Pages can still set `energy="active"` or `energy="focused"` explicitly
- **Primary buttons:** Always default to focused (they are the primary action)
- **Non-primary buttons:** Default to idle (silence state)
- **No visual changes:** This is behavioral refinement, not visual work

---

## Next Steps

Phase 4C is complete. Next: Phase 4A (Attention Decay) - energy states decay back to neutral after inactivity.

