# Sitter Routes Posture Assignment

**Date:** 2025-01-27
**Phase:** Phase 3 - Sitters Conversion

---

## Sitter Routes Identified

### 1. `/bookings/sitters` (Admin Sitters List)
**File:** `src/app/bookings/sitters/page.tsx`
**Purpose:** Admin view for managing sitters (list, add, edit, delete, configure)
**Posture:** **Configuration**
**Page Class:** Configuration
**Reasoning:** 
- Sitter configuration and onboarding
- Permissions and management
- Commission settings
- Active/inactive status
- Maximum stability, minimal motion, strong spatial separation

**Traffic:** HIGH (Primary admin sitter management surface)

---

### 2. `/sitter` (Sitter Dashboard)
**File:** `src/app/sitter/page.tsx`
**Purpose:** Sitter-facing dashboard with tabs: today, upcoming, completed, earnings, settings, tier
**Posture:** **Operational** (dominant)
**Page Class:** Operational
**Reasoning:** 
- Primary tabs (today, upcoming, completed) are job management and scheduling execution = Operational
- Earnings tab is Analytical (metrics), but subordinate via component composition (TabPanel)
- Settings tab is Configuration (preferences), but subordinate via component composition (TabPanel)
- Tier tab is Analytical (performance metrics), but subordinate via component composition (TabPanel)
- Dominant posture is Operational since primary use case is job management and execution

**Traffic:** HIGH (Primary sitter-facing surface)

**Note:** Mixed physiologies within tabs, but dominant posture is Operational. Analytical and Configuration tabs are subordinate via component composition (Tabs/TabPanel pattern).

---

### 3. `/sitter-dashboard` (Sitter Job Management Dashboard)
**File:** `src/app/sitter-dashboard/page.tsx`
**Purpose:** Sitter job management dashboard (pending, accepted, archived, tooLate, tier tabs)
**Posture:** **Operational** (dominant)
**Page Class:** Operational
**Reasoning:**
- Primary tabs (pending, accepted, archived, tooLate) are job management and scheduling execution = Operational
- Tier tab is Analytical (performance metrics), but subordinate via component composition (TabPanel)
- Job acceptance, management, execution focus
- Dominant posture is Operational since primary use case is job management and execution

**Traffic:** MEDIUM (Alternative sitter dashboard, possibly admin-view specific)

---

## Conversion Order (By Traffic Priority)

1. **`/bookings/sitters`** - Configuration posture (HIGH traffic, admin)
2. **`/sitter`** - Operational posture (HIGH traffic, sitter-facing)
3. **`/sitter-dashboard`** - Operational posture (MEDIUM traffic, alternative dashboard)

---

## Posture Rules Applied

- **Configuration:** Sitter configuration, permissions, onboarding, management → `/bookings/sitters`
- **Operational:** Job management, assignments, scheduling execution → `/sitter`, `/sitter-dashboard` (dominant)
- **Analytical:** Performance, earnings, utilization, reliability metrics → `/sitter` earnings/tier tabs, `/sitter-dashboard` tier tab (subordinate)

---

## Next Steps

1. Convert `/bookings/sitters` first (Configuration)
2. Convert `/sitter` second (Operational dominant)
3. Convert `/sitter-dashboard` third (Operational dominant)
