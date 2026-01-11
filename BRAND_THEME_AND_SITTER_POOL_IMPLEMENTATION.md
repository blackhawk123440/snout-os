# Brand Theme and Sitter Pool Visibility Implementation

## Overview

Implementation of Part 1 (Brand Theme Enforcement), Part 2 (Sitter Pool Visibility), and Part 3 (Build Hash Display) to address visual verification failures.

## Part 1: Brand Theme Enforcement

### Changes Made

**File: `src/lib/design-tokens.ts`**

Updated semantic color aliases to use Snout brand colors:

- `background.secondary`: Changed from `#fafafa` (gray) to `#fce1ef` (Snout pink)
- `background.tertiary`: Changed from `#f5f5f5` (gray) to `#fef7fb` (light pink tint)
- `text.primary`: Changed from `#171717` (dark gray) to `#432f21` (Snout brown)
- `border.default`: Changed from `#e5e5e5` (gray) to `#f5bfdb` (light pink)

### How It Works

Components using semantic tokens automatically inherit the brand theme:

- `AppShell` uses `tokens.colors.background.secondary` → Now shows pink tint
- `Card` uses `tokens.colors.background.primary` (white) with `tokens.colors.border.default` → Now shows pink borders
- All text uses `tokens.colors.text.primary` → Now shows brown text
- Navigation and headers use semantic tokens → Automatically inherit brand colors

### Components Affected

All components using semantic tokens are automatically updated:
- AppShell (background.secondary)
- PageHeader (background.primary, border.default)
- Card (background.primary, border.default)
- Tabs (border.default)
- Badge (uses semantic colors)
- Button (uses semantic colors)
- StatCard (background.primary, border.default)
- Table mobile cards (background.primary, border.default)
- Modal (background.primary, border.default)

**No component-specific changes needed** - tokens system ensures consistent branding.

## Part 2: Sitter Pool Visibility

### Current Implementation Status

**API Layer:**
- ✅ `GET /api/bookings` returns `sitterPool` data with nested `sitter` and `currentTier`
- ✅ `GET /api/bookings/[id]` returns `sitterPool` data
- ✅ `PATCH /api/bookings/[id]` supports `sitterPoolIds` updates with event logging

**Component Layer:**
- ✅ `BookingCardMobileSummary` extracts `sitterPool` from booking prop (line 79-80)
- ✅ Shows sitter pool summary when pool exists (line 247-258): "Pool: Name1, Name2 +2"
- ✅ `SitterPoolPicker` integrated and visible on card (line 277-282)
- ✅ Pool data flows from API → bookings page → renderBookingMobileCard → BookingCardMobileSummary

### Code References

**BookingCardMobileSummary.tsx:**
```typescript
const sitterPool = booking.sitterPool || [];
const sitterPoolSitters = sitterPool.map(p => p.sitter);

// Sitter pool summary display (lines 247-258)
{sitterPoolSitters.length > 0 && (
  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
    Pool: {sitterPoolSitters.map(s => s.firstName).join(', ')}
    {sitterPoolSitters.length > 2 && ` +${sitterPoolSitters.length - 2}`}
  </div>
)}

// SitterPoolPicker control (lines 277-282)
<SitterPoolPicker
  bookingId={booking.id}
  currentPool={sitterPoolSitters}
  availableSitters={availableSitters}
  onPoolChange={onSitterPoolChange}
  compact={true}
/>
```

## Part 3: Build Hash Display

### Implementation

**File: `src/components/ui/BuildHash.tsx` (new)**

Client component that displays the git commit hash in the bottom-right corner. Only visible when `NEXT_PUBLIC_SHOW_BUILD_HASH` is set to `'true'`.

**File: `src/app/layout.tsx`**

Added `BuildHash` component to root layout.

### Usage

To enable build hash display, set environment variables at build time:

```bash
NEXT_PUBLIC_SHOW_BUILD_HASH=true
NEXT_PUBLIC_BUILD_HASH=$(git rev-parse --short HEAD)
npm run build
```

## Files Changed

1. **src/lib/design-tokens.ts** - Updated semantic color aliases
2. **src/components/ui/BuildHash.tsx** - New component for build hash display
3. **src/app/layout.tsx** - Added BuildHash component
4. **MOBILE_UI_ACCEPTANCE_CHECKLIST.md** - Added visual verification section
5. **DESKTOP_UI_ACCEPTANCE_CHECKLIST.md** - Added visual verification section

## Verification Requirements

### Visual Verification Required

**Brand Colors:**
- ✅ Code: Design tokens updated
- ⏳ Visual: Screenshot required showing pink/white/brown theme on mobile booking cards
- ⏳ Visual: Screenshot required showing brand colors on desktop

**Sitter Pool:**
- ✅ Code: API returns data, component displays pool, picker integrated
- ⏳ Visual: Screenshot required showing sitter pool summary on card when pool exists
- ⏳ Visual: Screenshot required showing SitterPoolPicker control on card
- ⏳ Functional: Test adding/editing sitter pool from card

## Build Status

- Typecheck: ✅ PASS
- Build: ✅ PASS

## Next Steps

1. Deploy with `NEXT_PUBLIC_SHOW_BUILD_HASH=true` and `NEXT_PUBLIC_BUILD_HASH` set
2. Capture screenshots on mobile (390x844, 430x932) showing:
   - Brand colors visible (pink/white/brown, not gray)
   - Sitter pool visible on booking cards (when pool exists)
   - SitterPoolPicker control visible and functional
3. Capture screenshots on desktop showing brand colors
4. Update checklists with PASS status and screenshot references


