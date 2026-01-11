# Mobile Bookings UI Refactor - Implementation Required

## Current Status

✅ **Completed:**
- Design tokens updated:
  - `background.secondary` = `#feecf4` (primary canvas wash)
  - Border colors updated to ultra-light pink strokes
  - Cards use white background (already configured)

⏳ **Remaining Work:**

1. **Typography and Action Hierarchy** (BookingCardMobileSummary)
   - Client name: Dominant (2xl, bold) - currently xl
   - Service/Date: Secondary (reduce visual weight)
   - Actions: Condense to primary + More menu
   - Status: Light but legible

2. **Double Scroll Fix** (booking detail page)
   - Remove nested `overflow-y: auto` containers
   - Single page scroll only
   - Lines to check: 938, 1319, 1721, 2275

3. **Sitter Pool Visibility** (booking detail page)
   - Add visible sitter pool section
   - Show availability and quick assign
   - Surface even when assigned

4. **Price Breakdown** (booking detail page)
   - Already exists but verify it's visible by default
   - Ensure line items show: service, quantity, unit price, subtotal

5. **Header Flattening** (booking detail page)
   - Remove fixed nested header containers
   - Flatten into normal scroll flow
   - Around line 1200-1300 (desktop header section)

6. **App Background Color**
   - Apply `#feecf4` to AppShell background
   - Ensure cards remain white

## Implementation Strategy

Given the file size (2461 lines for booking detail), implement in focused sections:
1. Fix design token application (AppShell background)
2. Refactor BookingCardMobileSummary typography
3. Fix booking detail scroll behavior
4. Add/update sitter pool section
5. Verify pricing breakdown
6. Flatten header structure

