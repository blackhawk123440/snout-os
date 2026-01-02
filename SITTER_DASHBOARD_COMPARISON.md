# Sitter Dashboard Comparison

**Date:** 2025-01-27

## `/sitter` vs `/sitter-dashboard`

These are **NOT redundant** - they serve different purposes:

### `/sitter` (Sitter Dashboard)
- **Purpose:** Personal sitter dashboard for viewing and managing assigned bookings
- **Tabs:** Today, Upcoming, Completed, Earnings, Settings, Tier
- **API:** `/api/sitter/${id}/bookings`
- **Focus:** Execution of assigned bookings (check-in, view details)
- **Posture:** Operational (dominant)

### `/sitter-dashboard` (Sitter Job Management Dashboard)
- **Purpose:** Job management dashboard for pool requests and calendar view
- **Tabs:** Pending, Accepted, Archived, Too Late, Tier
- **API:** `/api/sitters/${id}/dashboard`
- **Focus:** Job acceptance, pool requests, calendar view, admin view
- **Posture:** Operational (dominant)
- **Features:** Calendar view toggle, admin view mode (`admin=true`), pool request acceptance

### Usage
- `/sitter`: Used by sitters for daily execution (check-in, view today's visits)
- `/sitter-dashboard`: Used for job management (accept pool requests, view calendar, admin oversight)

Both serve different use cases and should remain separate.

