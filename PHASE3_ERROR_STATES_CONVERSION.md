# Phase 3 Error and Empty States Conversion

**Date:** 2025-01-27

---

## Conversion Summary

Applied Critical state characteristics to error cards across key routes where appropriate. Error states that represent critical issues (not found, failed to load data, system errors) now use `depth="critical"` for heightened clarity and controlled urgency.

**Important:** Routes retain their dominant posture via `AppShell`. Critical errors are expressed as a Critical state using `Card depth="critical"` within the existing route posture (e.g., Operational, Configuration, Analytical).

---

## Critical State Characteristics Applied

- **Heightened clarity:** Error messages are clear and direct
- **Controlled tone:** Error states remain composed, not alarming
- **Tight motion:** Minimal motion (200ms transitions per `MOTION_DURATIONS.critical`)
- **Pink intensity:** Can increase slightly but remains controlled (through error colors)
- **Clear next action:** Error states include retry or recovery paths
- **Spatial emphasis:** Higher elevation through shadow and z-index (not through DEPTH_OFFSETS transform)

---

## Changes Made

### Error Cards with Critical Depth

Error cards that represent critical issues (data loading failures, not found states, system errors) were updated to use `depth="critical"` instead of `depth="elevated"`:

1. **Booking Detail (`/bookings/[id]`)**: "Booking Not Found" error card
2. **Messages (`/messages`)**: Error banner for "Failed to load message templates" (Operational posture)
3. **Messages Modal**: Error card in template edit/create modal (within Operational posture)
4. **Sitters Admin (`/bookings/sitters`)**: Error banner for failed API calls (Configuration posture)

### Empty States

Empty states remain as-is since they are informational (no data) rather than critical errors. Operational empty states (like "No templates found") are appropriate for their context and don't need Critical depth. Empty states that represent error conditions (like "Booking Not Found") use `depth="critical"` on the wrapping Card.

---

## Files Modified

1. `src/app/bookings/[id]/page.tsx`: Booking Not Found error card (Operational posture)
2. `src/app/messages/page.tsx`: Error banner and modal error card (Operational posture)
3. `src/app/bookings/sitters/page.tsx`: Error banner (Configuration posture)

Note: Not all error states are critical. Form validation errors, inline field errors, and non-critical warnings remain at `depth="elevated"`. Only critical error states (failed data loads, not found resources, system errors requiring immediate attention) use `depth="critical"`.

---

## Verification

- ✅ Error states display with critical depth (higher elevation via shadow and z-index)
- ✅ Routes retain their dominant posture (Operational, Configuration, etc.)
- ✅ Error messages are clear and direct
- ✅ Recovery actions (retry buttons, navigation links) are present
- ✅ Tone remains controlled and composed
- ✅ Motion remains tight (200ms transitions per system constants)
- ✅ Typecheck passes

---

## Notes

- **Routes do not switch to Critical posture.** Each route maintains its dominant posture via `AppShell physiology`. Critical errors are expressed as a state within that posture using `Card depth="critical"`.
- Critical depth uses shadow (`tokens.shadows.critical`) and z-index (`tokens.zIndex.critical: 200`) for spatial emphasis, not transform offsets.
- Form validation errors and inline errors remain at elevated depth (not critical).
- Empty states remain operational/informational (not critical) unless they represent an error condition.
- Error colors (red) already provide semantic meaning; critical depth adds spatial emphasis through higher elevation.

