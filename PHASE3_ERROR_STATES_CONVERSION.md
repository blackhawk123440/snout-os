# Phase 3 Error and Empty States Conversion

**Date:** 2025-01-27

---

## Conversion Summary

Applied Critical posture characteristics to error and empty states across key routes where appropriate. Error states that represent critical issues (not found, failed to load data, system errors) now use `depth="critical"` for heightened clarity and controlled urgency.

---

## Critical Posture Characteristics Applied

- **Heightened clarity:** Error messages are clear and direct
- **Controlled tone:** Error states remain composed, not alarming
- **Tight motion:** Minimal motion (200ms transitions)
- **Pink intensity:** Can increase slightly but remains controlled (through error colors)
- **Clear next action:** Error states include retry or recovery paths

---

## Changes Made

### Error Cards with Critical Depth

Error cards that represent critical issues (data loading failures, not found states, system errors) were updated to use `depth="critical"` instead of `depth="elevated"`:

1. **Data Loading Failures:** Error banners for failed API calls
2. **Not Found States:** Error cards for missing resources (booking not found, etc.)
3. **System Errors:** Critical error states that require user attention

### Empty States

Empty states remain as-is since they are informational (no data) rather than critical errors. Operational empty states (like "No templates found") are appropriate for their context and don't need Critical posture.

---

## Files Modified

Error cards updated to use `depth="critical"` where appropriate:
- Error banners for data loading failures
- Error cards for not found states
- Error cards in modals for critical form errors

Note: Not all error states are critical. Form validation errors, inline field errors, and non-critical warnings remain at `depth="elevated"`.

---

## Verification

- ✅ Error states display with critical depth (higher elevation)
- ✅ Error messages are clear and direct
- ✅ Recovery actions (retry buttons, etc.) are present
- ✅ Tone remains controlled and composed
- ✅ Motion remains tight (200ms transitions)

---

## Notes

- Critical posture is applied to error states that require immediate user attention
- Form validation errors and inline errors remain at elevated depth (not critical)
- Empty states remain operational/informational (not critical) unless they represent an error condition
- Error colors (red) already provide semantic meaning; critical depth adds spatial emphasis

