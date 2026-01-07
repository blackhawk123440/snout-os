# Calendar Month View Mobile Fix

## Problem Identified

The weekday header (Sun Mon Tue Wed Thu Fri Sat) was stacking vertically on mobile Safari, and the month grid was not rendering as a true 7-column calendar.

## Root Cause

1. **Grid columns collapsing**: Using `gridTemplateColumns: 'repeat(7, minmax(0, 1fr))'` allowed columns to shrink to zero width on narrow screens
2. **No minimum width constraint**: Without a minimum width, the grid tried to fit 7 columns into ~390px, causing them to stack
3. **Missing scrollable wrapper**: The calendar wasn't wrapped in a horizontally scrollable container on mobile

## Solution Implemented

### Mobile (<= 768px)
- **Wrapped calendar in scrollable container**: Added `overflowX: 'auto'` wrapper with `minWidth: '700px'`
- **Fixed grid column sizing**: Changed from `minmax(0, 1fr)` to `minmax(80px, 1fr)` to prevent collapse
- **Added minimum width to grid items**: Set `minWidth: '80px'` on weekday header cells and day cells
- **Ensured 7 columns always**: Grid always renders as 7 columns, scrolls horizontally if needed

### Desktop (> 768px)
- **Unchanged**: Still uses `minmax(0, 1fr)` for flexible column sizing
- **No wrapper**: No scrollable wrapper needed
- **Same layout**: Maintains existing desktop behavior

## Files Changed

### `src/app/calendar/page.tsx`

**Key Changes**:

1. **Conditional wrapper for mobile**:
```typescript
{isMobile ? (
  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
    <div style={{ minWidth: '700px', width: '100%' }}>
      {/* Weekday header and calendar grid */}
    </div>
  </div>
) : (
  <>
    {/* Desktop: Direct weekday header and calendar grid */}
  </>
)}
```

2. **Mobile weekday header**:
```typescript
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', // Fixed min prevents collapse
    // ...
  }}
>
  {dayNames.map((day) => (
    <div
      style={{
        minWidth: '80px', // Prevent grid item from collapsing
        // ...
      }}
    >
      {day}
    </div>
  ))}
</div>
```

3. **Mobile calendar grid**:
```typescript
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', // Fixed min prevents collapse
    // ...
  }}
>
  {calendarDays.map((day, index) => (
    <div
      style={{
        minWidth: isMobile ? '80px' : 0, // Prevent collapse on mobile
        // ...
      }}
    >
      {/* Day content */}
    </div>
  ))}
</div>
```

4. **Desktop remains unchanged**:
```typescript
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', // Flexible on desktop
    // ...
  }}
>
```

## What Rule Caused Vertical Stacking?

The issue was caused by:
1. **`minmax(0, 1fr)`**: This allows grid columns to shrink to zero width, which on mobile Safari caused the grid to collapse and items to stack vertically
2. **No minimum width constraint**: Without a minimum width on the container or grid items, the browser tried to fit 7 columns into ~390px, causing overflow and stacking
3. **Missing horizontal scroll**: Without a scrollable wrapper, the browser had no way to handle the overflow except by stacking

## Verification

### Mobile (iPhone ~390px)
- ✅ Weekday header renders as 7 columns in one row (Sun Mon Tue Wed Thu Fri Sat)
- ✅ Weekday header does NOT stack vertically
- ✅ Month grid renders as 7 columns
- ✅ Calendar scrolls horizontally when needed (min-width 700px)
- ✅ All day cells are visible and properly sized

### Desktop (>= 768px)
- ✅ Weekday header renders as 7 columns (unchanged)
- ✅ Month grid renders as 7 columns (unchanged)
- ✅ No horizontal scroll (unchanged)
- ✅ All functionality works as before

## Technical Details

- **Mobile breakpoint**: 768px (matches `isMobile` state)
- **Minimum width**: 700px on mobile (ensures readable 7-column layout)
- **Grid column min**: 80px on mobile (prevents collapse)
- **Scroll behavior**: `overflowX: 'auto'` with `WebkitOverflowScrolling: 'touch'` for smooth iOS scrolling
- **Grid layout**: Always `display: grid` with `gridTemplateColumns: 'repeat(7, ...)'` - never changes to flex or block

## Summary

The fix ensures:
1. ✅ Weekday header always 7 columns (never stacks)
2. ✅ Month grid always 7 columns (never stacks)
3. ✅ Mobile scrolls horizontally (min-width 700px)
4. ✅ Desktop unchanged (flexible columns)
5. ✅ No layout rules that cause vertical stacking

