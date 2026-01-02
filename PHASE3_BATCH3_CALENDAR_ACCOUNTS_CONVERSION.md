# Phase 3 Batch 3: Calendar Accounts Page Conversion

**Route:** `/calendar/accounts`  
**Posture:** Configuration  
**Date:** 2025-01-27

---

## Posture Determination

The calendar accounts page is a **configuration surface** for:
- Managing calendar account connections
- Adding/removing calendar integrations
- Managing access tokens and refresh tokens
- Activating/deactivating accounts

This is clearly **Configuration posture** - account connections, tokens, settings.

---

## Changes Applied

### Complete Rewrite
- Removed legacy `COLORS` import from `@/lib/booking-utils`
- Replaced all legacy `className` and inline `style` attributes with System DNA components
- Wrapped page content in `AppShell physiology="configuration"`
- Used `PageHeader` for title and description
- Used `Card depth="elevated"` for account list items
- Used `Card depth="critical"` for error states
- Used `Modal` component for add account form
- Used `FormRow`, `Input`, `Select`, `Button` components
- Implemented loading state with `Skeleton`
- Implemented error state with `EmptyState` and `Card depth="critical"`
- Applied `energy="active"` to primary "Add Account" button

### State Tokens
- Added `depth="elevated"` to:
  - Loading Card (Skeleton)
  - Account Cards (one per account)
- Added `depth="critical"` to:
  - Error banner Card
  - Error Card within modal (if present)
- Added `energy="active"` to:
  - "Add Account" button in PageHeader
  - "Add Account" button in modal form

### Component Updates
- All form controls use new Input and Select components
- Modal uses System DNA Modal component
- Badges use System DNA Badge component
- Empty state uses System DNA EmptyState component
- All styling is token-based

---

## Verification

- ✅ Typecheck passes
- ✅ All Cards have depth tokens
- ✅ Primary actions have active energy
- ✅ Error states use critical depth
- ✅ Configuration posture correctly applied
- ✅ No legacy styling remains
- ✅ All components use System DNA

---

## Notes

- This was a full rewrite similar to `/templates/[id]` in Batch 1.5
- Removed all legacy COLORS usage
- Replaced alert() calls with proper error state management
- Improved error handling with proper error state display
- Form validation uses required attributes and disabled states

