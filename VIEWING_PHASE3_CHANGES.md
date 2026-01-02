# Viewing Phase 3 Changes

## Start Development Server

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npm run dev
```

The server will start at `http://localhost:3000`

---

## Routes to View

### Observational Posture
- **Dashboard:** `http://localhost:3000/`
  - Look for: Wide layouts, slower/calmer motion, `energy="focused"` on "View All Bookings" button

### Analytical Posture
- **Payments:** `http://localhost:3000/payments`
  - Look for: Tighter spacing, sharper layout, responsive transitions (300ms)

### Operational Posture
- **Bookings List:** `http://localhost:3000/bookings`
  - Look for: `energy="active"` on "New Booking" button, reduced ambient motion (150ms)
  
- **Booking Detail:** `http://localhost:3000/bookings/[any-booking-id]`
  - Look for: `energy="active"` on status button, two-column layout, `depth="critical"` on error card (if booking not found)
  
- **Messages:** `http://localhost:3000/messages`
  - Look for: `energy="active"` on "New Template" button, `depth="critical"` on error banner (if errors occur)
  
- **Sitter Dashboard:** `http://localhost:3000/sitter`
  - Look for: `energy="active"` on "Check In" buttons, operational clarity
  
- **Sitter Dashboard Alt:** `http://localhost:3000/sitter-dashboard`
  - Look for: `energy="active"` on "Accept" buttons, calendar view

### Configuration Posture
- **Settings:** `http://localhost:3000/settings`
  - Look for: Maximum stability, minimal motion (200ms), `SectionHeader` components
  
- **Sitters Admin:** `http://localhost:3000/bookings/sitters`
  - Look for: Stable layout, `depth="critical"` on error banner (if errors occur)

---

## What to Look For

### Posture Differences
- **Observational:** Calm, wide layouts, slower motion
- **Analytical:** Sharper, tighter spacing, responsive
- **Operational:** Execution-focused, reduced motion, clear action zones
- **Configuration:** Maximum stability, minimal motion

### State Tokens
- **`energy="active"`** on primary action buttons (Operational routes)
- **`energy="focused"`** on primary action buttons (Observational routes)
- **`depth="critical"`** on error cards (higher elevation, subtle pink shadow)

### Visual Consistency
- All cards use `depth="elevated"` for spatial hierarchy
- White + pink #fce1ef color system throughout
- Consistent spacing and typography via design tokens
- No page-specific styling drift

---

## Testing Error States (Critical Depth)

To see `depth="critical"` in action:

1. **Booking Detail:** Navigate to `/bookings/invalid-id` to see "Booking Not Found" error card
2. **Messages:** Trigger an error (e.g., network issue) to see error banner
3. **Sitters Admin:** Trigger an error to see error banner

Error cards should have higher elevation (subtle pink shadow) while remaining composed and controlled.

