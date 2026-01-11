# Mobile Bookings UI Refactor - Implementation Plan

## Overview

Comprehensive refactor of mobile bookings UI to address visual hierarchy, scroll behavior, functionality, and UX issues.

## Changes Required

### 1. Color System Fix
**Status**: ✅ Design tokens updated
- App background: `#feecf4` (primary canvas wash)
- Cards: White with subtle border and shadow (no pink fills)
- Borders: Ultra light pink stroke (`#f5d0e3`)
- Accent pink: Only for badges, buttons, highlights

**Files Changed**:
- `src/lib/design-tokens.ts` - Updated background.secondary to `#feecf4`, border colors
- `src/components/ui/Card.tsx` - Already uses white background, subtle shadow

### 2. Typography and Action Hierarchy
**Status**: ⏳ In Progress - BookingCardMobileSummary refactored, needs integration
- Client name: Dominant (2xl, bold)
- Service/Date: Secondary (base/sm, medium weight)
- Status: Light but legible
- Price: Bold when relevant
- Actions: Condensed to primary action + More menu

**Files Changed**:
- `src/components/bookings/BookingCardMobileSummary.tsx` - Refactored (needs action handlers)
- Needs: Integration with assign/sitter pool handlers from bookings page

### 3. Double Scroll Fix
**Status**: ⏳ Pending
- Remove nested overflow containers on booking detail
- Single page scroll only
- Header sticky only if necessary for actions

**Files to Change**:
- `src/app/bookings/[id]/page.tsx` - Remove overflow-y: auto from inner containers

### 4. Sitter Pool Visibility
**Status**: ⏳ Pending
- Add visible sitter pool section on booking detail
- Show availability and quick assign
- Surface pool even when assigned

**Files to Change**:
- `src/app/bookings/[id]/page.tsx` - Add sitter pool section

### 5. Price Breakdown
**Status**: ⏳ Pending
- Replace flat total with line-item breakdown
- Show: Service, quantity, unit price, subtotal per line
- Display total clearly

**Files to Change**:
- `src/app/bookings/[id]/page.tsx` - Add PricingBreakdown component/section

### 6. Header Card Flattening
**Status**: ⏳ Pending
- Remove fixed nested header containers
- Flatten into normal scroll flow
- No secondary scroll containers

**Files to Change**:
- `src/app/bookings/[id]/page.tsx` - Flatten header section

## Implementation Order

1. ✅ Design tokens (color system)
2. ⏳ BookingCardMobileSummary (typography, actions) - needs handler integration
3. ⏳ Booking detail page refactor (all remaining items)

## Next Steps

1. Complete BookingCardMobileSummary action handler integration
2. Refactor booking detail page systematically
3. Test and verify


