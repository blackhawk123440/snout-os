# Phase 4A: Attention Decay Conversion

**Date:** 2025-01-27  
**Status:** Complete  
**Phase:** 4A - Behavioral Refinement

---

## Overview

Implemented system-level attention decay so energy states (active, focused) return to idle after a period of inactivity. This is behavioral self-regulation, not visual change. The UI feels self-regulating, not just responsive.

**Key Principle:** Decay is gradual, system-driven, and enforced at component level. User interaction resets decay naturally.

---

## Goal

Energy states (active, focused) should calm themselves when nothing is happening. The system should never feel permanently "alert."

---

## Rule

**Active and focused energy always decays back to neutral. No page logic decides this. The system does.**

This is what makes the UI feel alive without trying.

---

## Changes Made

### 1. System Constants

**Added:** `ATTENTION_DECAY_DURATION: 4000` (4 seconds) to `SYSTEM_CONSTANTS`

**Rationale:** 4 seconds provides enough time for user to notice and interact, but not so long that the system feels permanently alert.

### 2. Button Component Attention Decay

**Implementation:**
- Only applies to primary variant buttons with `energy="active"` or `energy="focused"`
- Uses React hooks (`useState`, `useEffect`, `useRef`) to track interaction time
- After 4 seconds of inactivity, energy state decays to `'idle'`
- Decay is gradual via CSS transitions (handled by motion system)
- User interaction (mouse enter, focus, click) resets decay timer

**Behavior:**
- Button starts with initial energy (active/focused)
- Tracks last interaction time
- After 4 seconds of inactivity, gradually transitions to idle
- On interaction, immediately resets to initial energy
- CSS transitions handle the smooth color change (no abrupt snaps)

### 3. System DNA Rule Added

**Added:** `ATTENTION_DECAY: true` to `SYSTEM_DNA_RULES`

**Documentation:**
```
Phase 4A: Attention decay - energy states (active, focused) decay back to idle after inactivity.
System-driven self-regulation, not animation or UX flourish.
Decay is gradual (via CSS transitions), not abrupt.
User interaction (mouse enter, focus, click) resets decay naturally.
Enforced at component level, not page level.
This makes the UI feel self-regulating, not just responsive.
```

---

## Files Modified

1. **`src/lib/system-dna.ts`**
   - Added `ATTENTION_DECAY_DURATION: 4000` to `SYSTEM_CONSTANTS`
   - Added `ATTENTION_DECAY: true` to `SYSTEM_DNA_RULES`

2. **`src/components/ui/Button.tsx`**
   - Added React imports: `useState`, `useEffect`, `useRef`
   - Added `SYSTEM_CONSTANTS` import
   - Implemented decay state management
   - Added `resetDecay()` function
   - Added interaction handlers (`handleFocus`, `handleClick`) that reset decay
   - Updated `handleMouseEnter` to reset decay
   - Added useEffect hooks for decay timer management

---

## Implementation Details

### Decay Logic

- **Applies to:** Primary buttons with `energy="active"` or `energy="focused"`
- **Decay duration:** 4 seconds (configurable via `ATTENTION_DECAY_DURATION`)
- **Transition:** Gradual via CSS transitions (motion system handles smooth color change)
- **Reset triggers:** Mouse enter, focus, click
- **Initial state:** Component starts with initial energy, decay timer begins

### Edge Cases Handled

- Component unmount: Timer is cleaned up
- Energy prop changes: Decay state resets to new initial energy
- Disabled/loading states: Decay is paused
- Non-primary buttons: Decay doesn't apply (energy doesn't affect visual appearance)

---

## Verification

- ✅ Typecheck passes
- ✅ Decay only applies to primary buttons with active/focused energy
- ✅ Decay is gradual (CSS transitions handle smooth color change)
- ✅ User interaction resets decay naturally
- ✅ No page-level timers (enforced at component level)
- ✅ System DNA rule added and documented
- ✅ Timer cleanup on unmount and prop changes

---

## Behavioral Impact

**Before Phase 4A:**
- Energy states stayed at active/focused indefinitely
- System felt permanently "alert"
- No self-regulation

**After Phase 4A:**
- Energy states (active/focused) decay to idle after 4 seconds of inactivity
- Decay is gradual (smooth CSS transitions)
- User interaction resets decay naturally
- System feels self-regulating, not just responsive
- UI feels alive without trying

---

## Implementation Notes

- **System-enforced:** Button component enforces decay, not page logic
- **Gradual transition:** CSS transitions handle smooth color change (no abrupt snaps)
- **Natural reset:** User interaction (mouse enter, focus, click) resets decay
- **No visual changes:** This is behavioral refinement, not visual work
- **Component-level:** No page-level timers or logic needed

---

## What Phase 4A Is

- Time-based return to silence
- System-driven, not page-driven
- No new visuals
- No timers sprinkled through pages
- Behavioral self-regulation

## What Phase 4A Is Not

- Not animation
- Not hover logic
- Not page state
- Not UX flourish

---

## Next Steps

Phase 4A is complete. Next: Phase 4B (Progressive Density) - spacing tightens as you go deeper into pages.

**Recommendation:** Test Phase 4A in the running app to feel the system breathe before proceeding to Phase 4B.

