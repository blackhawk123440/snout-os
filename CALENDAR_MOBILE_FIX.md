# Calendar Mobile Safari Fix

## Issues Identified

### 1. Weekday Header Stacking Vertically
**Root Cause**: The grid layout was using `gridTemplateColumns: 'repeat(7, minmax(0, 1fr))'` which should work, but on mobile Safari, the Card container had `overflow: 'hidden'` and `maxWidth: '100%'` which was causing the grid to collapse. Additionally, without a minimum width constraint, the 7 columns were trying to fit in a very narrow space, causing them to stack.

**Fix**: 
- Added explicit `minWidth: '600px'` to both the weekday header and calendar grid on mobile
- This ensures the 7 columns always render horizontally
- Made the Card container horizontally scrollable on mobile with `overflowX: 'auto'` and `WebkitOverflowScrolling: 'touch'`
- Added `minWidth: 0` to grid items to prevent overflow issues

### 2. Month Grid Overflow and Clipping
**Root Cause**: The Card had `overflow: 'hidden'` which was clipping the calendar content. The grid also had `maxWidth: '100vw'` which could cause issues.

**Fix**:
- Changed Card `overflow` from `'hidden'` to `'auto'` on mobile (with `overflowX: 'auto'` for horizontal scrolling)
- Removed `overflow: 'hidden'` from the calendar grid
- Added `minWidth: '600px'` to ensure grid maintains 7 columns
- Grid now scrolls horizontally on mobile instead of being clipped

### 3. Header Controls Misaligned on Mobile
**Root Cause**: The header used `flexWrap: 'wrap'` which caused controls to wrap awkwardly. The layout wasn't optimized for mobile vertical stacking.

**Fix**:
- Changed header container to `flexDirection: 'column'` on mobile
- Stacked month navigation and view mode toggle vertically
- Made buttons full-width on mobile for easier tapping
- Added proper spacing with `gap: tokens.spacing[3]` on mobile
- Sitter filter now stacks vertically on mobile with full-width select

### 4. Default to Agenda View on Mobile
**Root Cause**: No logic to detect mobile and default to Agenda view.

**Fix**:
- Added `isMobile` state that detects screen width <= 768px
- Added `hasInitialized` flag to only set default on initial load
- On initial load, if mobile, set `viewMode` to `'agenda'`
- After initialization, user preference is respected (won't fight user)

## Files Changed

### `src/app/calendar/page.tsx`

**Key Changes**:

1. **Added mobile detection state**:
```typescript
const [isMobile, setIsMobile] = useState(false);
const [hasInitialized, setHasInitialized] = useState(false);
```

2. **Added useEffect for mobile detection and default view**:
```typescript
useEffect(() => {
  const checkMobile = () => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    
    if (!hasInitialized) {
      if (mobile) {
        setViewMode('agenda');
      }
      setHasInitialized(true);
    }
  };
  
  checkMobile();
  const handleResize = () => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

3. **Fixed Card container for month view**:
```typescript
<Card
  padding={false}
  style={{
    overflow: isMobile ? 'auto' : 'visible',
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    ...(isMobile ? {
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
    } : {}),
  }}
>
```

4. **Fixed weekday header with minWidth**:
```typescript
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    borderBottom: `1px solid ${tokens.colors.border.default}`,
    width: '100%',
    minWidth: isMobile ? '600px' : 'auto', // Ensure 7 columns
    boxSizing: 'border-box',
  }}
>
```

5. **Fixed calendar grid with minWidth**:
```typescript
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    width: '100%',
    minWidth: isMobile ? '600px' : 'auto', // Match header width
    boxSizing: 'border-box',
  }}
>
```

6. **Fixed header controls for mobile**:
```typescript
<div
  style={{
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: isMobile ? tokens.spacing[3] : tokens.spacing[4],
  }}
>
```

## Testing Checklist

### Mobile (iPhone width ~390px)
- [x] Weekday header renders as 7 columns (Sun Mon Tue Wed Thu Fri Sat)
- [x] Weekday header does NOT stack vertically
- [x] Month grid is horizontally scrollable (not clipped)
- [x] Header controls stack vertically with proper spacing
- [x] View mode buttons are full-width and easy to tap
- [x] Sitter filter is full-width and properly aligned
- [x] Default view is Agenda on initial load
- [x] User can switch to Month view and it scrolls horizontally

### Desktop (>= 768px)
- [x] Weekday header renders as 7 columns
- [x] Month grid displays normally (no horizontal scroll)
- [x] Header controls are in a row (not stacked)
- [x] Default view is Month (unchanged)
- [x] All functionality works as before

## Regression Prevention

The fixes ensure:
1. **Weekday header always 7 columns**: `minWidth: '600px'` on mobile prevents stacking
2. **No clipping**: Removed `overflow: 'hidden'`, added horizontal scroll on mobile
3. **Professional mobile layout**: Vertical stacking with proper spacing
4. **Desktop unchanged**: All mobile fixes are conditional on `isMobile` state

## Technical Details

- **Breakpoint**: 768px (standard tablet/mobile breakpoint)
- **Horizontal scroll**: Uses `overflowX: 'auto'` with `WebkitOverflowScrolling: 'touch'` for smooth iOS scrolling
- **Grid layout**: Always uses `repeat(7, minmax(0, 1fr))` for 7 columns
- **Mobile default**: Agenda view only set on initial load, respects user preference after

