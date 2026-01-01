# UI Rebuild Acceptance Checklist

**Purpose**: Verify enterprise dashboard rebuild meets all requirements  
**Date**: 2024-12-30  
**Branch**: `ui-rebuild-enterprise`

---

## Enterprise Requirements

### A. Zero Layout Variance
- [ ] All pages share same layout grid
- [ ] All pages use AppShell
- [ ] Consistent spacing rules (all from tokens)
- [ ] Content max-width consistent (1400px)
- [ ] Content padding consistent (24px)

### B. Zero Style Variance
- [ ] Design tokens created and used everywhere
- [ ] All components use tokens only
- [ ] No raw hex values in pages
- [ ] No raw px values in pages
- [ ] All pages use shared components only
- [ ] No page-level styling overrides

### C. Navigation Coherence
- [ ] Single navigation structure (AppShell sidebar)
- [ ] No duplicate nav links
- [ ] Clear primary sections:
  - [ ] Dashboard
  - [ ] Bookings
  - [ ] Calendar
  - [ ] Clients
  - [ ] Sitters
  - [ ] Automations
  - [ ] Payments
  - [ ] Settings
- [ ] Active route highlighting works
- [ ] Mobile navigation works

### D. Table Quality
- [ ] Sticky header implemented
- [ ] Row hover states work
- [ ] Status badges consistent
- [ ] Empty states implemented
- [ ] Loading skeletons implemented
- [ ] Consistent column alignment
- [ ] Sortable columns (where applicable)

### E. Detail Page Quality
- [ ] Two-column enterprise layout
- [ ] Main content left, actions right
- [ ] Sticky header with status
- [ ] Primary action visible

### F. Accessibility Baseline
- [ ] Keyboard navigable (Tab order logical)
- [ ] Focus states visible on all interactive elements
- [ ] Labels for all inputs
- [ ] No color-only meaning (status has text + color)
- [ ] ARIA labels where needed

---

## Page-by-Page Checklist

### ✅ Dashboard Home (`/`)
- [ ] Uses AppShell
- [ ] Uses PageHeader
- [ ] Uses StatCard for metrics
- [ ] Uses Card for sections
- [ ] Uses Button for actions
- [ ] No legacy styling
- [ ] Loading states with Skeleton
- [ ] Responsive grid layout

### ✅ Bookings List (`/bookings`)
- [x] Uses AppShell
- [x] Uses PageHeader
- [x] Uses Table component
- [x] Uses Input for search
- [x] Uses Select for filters
- [x] Uses Badge for status
- [x] Uses Card for filters section
- [x] Row click navigation works
- [x] Empty state implemented
- [x] Loading skeleton implemented
- [x] No legacy styling

### ✅ Booking Detail (`/bookings/[id]`)
- [x] Uses AppShell
- [x] Two-column layout (desktop) / Single column (mobile)
- [x] PageHeader with title, description, and actions
- [x] Primary actions in header
- [x] Uses Badge for status indicators
- [x] Uses Card for sections
- [x] Uses Button for actions
- [x] KPI strip with StatCards (Total, Payment Status, Balance, Service, Pets)
- [x] Left column: Schedule, Pets, Pricing, Status History
- [x] Right column: Status Control, Assignment Control, Client Information
- [x] Uses Modal for status changes and unassign confirmation
- [x] Loading, empty, error states implemented
- [x] No legacy styling
- [ ] ⚠️ **PENDING MANUAL VISUAL VERIFICATION**

### ✅ Calendar (`/calendar`)
- [x] Uses AppShell
- [x] Uses PageHeader
- [x] Uses Card for sections
- [x] Uses Button for navigation and actions
- [x] Uses Select for filters
- [x] Uses Badge for status indicators
- [x] Uses Modal for selected date details
- [x] Uses Skeleton for loading state
- [x] Uses EmptyState for empty states
- [x] Calendar grid uses design tokens
- [x] Event cards use design tokens
- [x] No legacy styling
- [ ] ⚠️ **PENDING MANUAL VISUAL VERIFICATION**

### ✅ Clients List (`/clients`)
- [x] Uses AppShell
- [x] Uses PageHeader
- [x] Uses Table component
- [x] Uses Card components
- [x] No legacy styling

### ⏳ Client Detail (if exists)
- [ ] Uses AppShell
- [ ] Two-column layout
- [ ] Uses Card for sections
- [ ] No legacy styling

### ⏳ Sitters List (`/bookings/sitters`)
- [ ] Uses AppShell
- [ ] Uses PageHeader
- [ ] Uses Table component
- [ ] Uses Card components
- [ ] No legacy styling

### ⏳ Sitter Detail (`/sitter`)
- [ ] Uses AppShell
- [ ] Uses PageHeader
- [ ] Uses Tabs for sections
- [ ] Uses Card components
- [ ] No legacy styling

### ✅ Settings (`/settings`)
- [x] Uses AppShell
- [x] Uses PageHeader
- [x] Uses Tabs for sections
- [x] Uses Input components
- [x] Uses Select components
- [x] Uses Button components
- [x] Uses Card components
- [x] Uses FormRow for form fields
- [x] No legacy styling

### ⏳ Automations (`/automation`)
- [x] Uses AppShell
- [x] Uses PageHeader
- [x] Uses Card components
- [x] Uses Tabs for category filtering
- [x] Uses FormRow, Input, Select, Textarea for forms
- [x] Uses Badge for status indicators
- [x] Uses Button for actions
- [x] Loading state implemented (Skeleton)
- [x] Empty state implemented (EmptyState)
- [x] Error state implemented
- [x] Success state implemented
- [x] No legacy styling
- [ ] ⚠️ **PENDING MANUAL VISUAL VERIFICATION**

### ✅ Payments (`/payments`)
- [x] Uses AppShell
- [x] Uses PageHeader
- [x] Uses StatCard for KPIs
- [x] Uses Table component
- [x] Uses Select for filters
- [x] Uses Input for search
- [x] Uses Badge for status
- [x] Uses Card for sections
- [x] Empty state implemented
- [x] Loading skeleton implemented
- [x] No legacy styling

### ✅ Sitter Dashboard (`/sitter`)
- [x] Uses AppShell
- [x] Uses PageHeader
- [x] Uses Tabs component
- [x] Uses Card for sections
- [x] Uses StatCard for metrics
- [x] Uses Badge for status indicators
- [x] Uses Button for actions
- [x] Uses Modal for booking details
- [x] Uses EmptyState for empty tabs
- [x] Uses Skeleton for loading
- [x] All tabs functional (today, upcoming, completed, earnings, tier, settings)
- [x] Visit detail modal works
- [x] No legacy styling

### ✅ Sitter Dashboard - Job Management (`/sitter-dashboard`)
- [x] Uses AppShell
- [x] Uses PageHeader
- [x] Uses Tabs component
- [x] Uses Card for sections
- [x] Uses StatCard for metrics
- [x] Uses Badge for status indicators
- [x] Uses Button for actions
- [x] Calendar view with grid layout (design tokens)
- [x] List view toggle works
- [x] Month navigation works
- [x] Job acceptance works (non-admin)
- [x] Admin view supported (read-only)
- [x] All tabs functional (pending, accepted, archived, tooLate, tier)
- [x] Uses EmptyState for empty tabs
- [x] Uses Skeleton for loading
- [x] No legacy styling

### ✅ Messages (`/messages`)
- [x] Uses AppShell
- [x] Uses PageHeader with title, description, and actions
- [x] Uses Card for template items
- [x] Uses Badge for template types
- [x] Uses Button for actions (New Template, Edit, Refresh)
- [x] Uses Modal for Add/Edit form
- [x] Uses Input, Select, Textarea for form fields
- [x] Uses FormRow for form layout
- [x] Uses EmptyState for no templates
- [x] Uses Skeleton for loading states
- [x] Error state with retry functionality
- [x] Field extraction and display ({{fieldName}} syntax)
- [x] Template content display with monospace font
- [x] No legacy styling
- [ ] **Note**: This page manages Message Templates (not conversation threads)

### ✅ Templates (`/templates`)
- [x] Uses AppShell
- [x] Uses PageHeader with title, description, and actions
- [x] Uses Card for template items and filters
- [x] Uses Input for search
- [x] Uses Select for category and type filters
- [x] Uses Badge for type, category, and status indicators
- [x] Uses Button for actions (Create, Edit, Delete, Refresh)
- [x] Uses Modal for delete confirmation
- [x] Uses EmptyState for no templates
- [x] Uses Skeleton for loading states
- [x] Success banner after delete
- [x] Error banner with retry
- [x] Template cards display all information
- [x] Search functionality works
- [x] Filters work (category, type)
- [x] Delete confirmation modal works
- [x] Edit links to separate edit page
- [x] No legacy styling

### ⏳ Pending Pages
- [x] Uses AppShell
- [x] Uses PageHeader
- [x] Uses Table component
- [x] Uses StatCard for metrics (Total Collected, Pending, Failed, Upcoming Payouts)
- [x] Uses Card components
- [x] Uses Input for client search
- [x] Uses Select for status filter and time range
- [x] Uses Badge for payment status
- [x] Uses Skeleton for loading state
- [x] Uses EmptyState for empty state
- [x] Error state implemented
- [x] No legacy styling
- [ ] ⚠️ **PENDING MANUAL VISUAL VERIFICATION**

### ⏳ Templates (`/templates`)
- [ ] Uses AppShell
- [ ] Uses PageHeader
- [ ] Uses Table component
- [ ] Uses Card components
- [ ] No legacy styling

### ⏳ Messages (`/messages`)
- [ ] Uses AppShell
- [ ] Uses PageHeader
- [ ] Uses Table component
- [ ] Uses Card components
- [ ] No legacy styling

### ⏳ Integrations (`/integrations`)
- [ ] Uses AppShell
- [ ] Uses PageHeader
- [ ] Uses Card components
- [ ] No legacy styling

### ⏳ Exceptions (`/exceptions`)
- [ ] Uses AppShell
- [ ] Uses PageHeader
- [ ] Uses Table component
- [ ] Uses Badge for severity
- [ ] Uses Card components
- [ ] No legacy styling

---

## Component Quality Checks

### Button
- [ ] All variants work (primary, secondary, tertiary, danger, ghost)
- [ ] All sizes work (sm, md, lg)
- [ ] Loading state works
- [ ] Disabled state works
- [ ] Focus state visible
- [ ] Icons work (left, right)

### Input
- [ ] Label displays correctly
- [ ] Error state works
- [ ] Helper text displays
- [ ] Focus state visible
- [ ] Disabled state works
- [ ] Icons work (left, right)

### Select
- [ ] Options render correctly
- [ ] Selected value displays
- [ ] Placeholder works
- [ ] Error state works
- [ ] Focus state visible

### Table
- [ ] Sticky header works
- [ ] Row hover works
- [ ] Empty state displays
- [ ] Loading skeleton displays
- [ ] Row click handler works
- [ ] Column alignment works

### Card
- [ ] Header section works
- [ ] Footer section works
- [ ] Padding consistent
- [ ] Border and shadow correct

### Badge
- [ ] All variants render
- [ ] Colors match design tokens

### Modal
- [ ] Opens/closes correctly
- [ ] Backdrop click closes (when enabled)
- [ ] Escape key closes (when enabled)
- [ ] Body scroll locked when open
- [ ] Focus trap works

---

## Responsive Checks

- [ ] Desktop layout works (1024px+)
- [ ] Tablet layout works (768px-1023px)
- [ ] Mobile layout works (<768px)
- [ ] Sidebar collapses on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Cards stack correctly on mobile
- [ ] Touch targets minimum 44px

---

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

---

## Performance

- [ ] No layout shift on load
- [ ] Images lazy load
- [ ] Tables virtualize for large datasets (if needed)
- [ ] Components render quickly

---

## Final Sign-off

**Overall Status**: ⏳ In Progress

**Blockers**: None

**Notes**: 
- Foundation complete (tokens, components, AppShell)
- Starting page conversions
- Dashboard home page converted as template

---

**Last Updated**: 2024-12-30

