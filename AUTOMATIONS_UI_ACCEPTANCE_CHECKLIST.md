# Automations UI Acceptance Checklist

## Page: Automations List (`/automations`)

### Top Section
- [ ] Create automation button visible and functional
- [ ] Search input filters automations by name/description
- [ ] Filter dropdowns: Enabled (all/enabled/disabled), Trigger Type, Status (all/draft/active/paused/archived)
- [ ] Stats cards show: Total Enabled, Runs Today, Failures Today

### Automation List
- [ ] Each row shows: Name, Trigger summary, Enabled toggle, Last run status, Quick actions
- [ ] Enabled toggle works and updates immediately
- [ ] Edit button navigates to builder
- [ ] Test button navigates to test page
- [ ] Last run status shows correct badge (success/error/skipped/never)
- [ ] Empty state shows when no automations match filters
- [ ] Mobile layout stacks properly

## Page: Automation Builder (`/automations/[id]` or `/automations/new`)

### Left Panel (Desktop) / Tabs (Mobile)
- [ ] Trigger section allows selecting trigger type
- [ ] Trigger config fields render based on selected trigger
- [ ] Conditions section shows condition groups
- [ ] Can add/remove condition groups
- [ ] Can set group operator (all/any)
- [ ] Can add/remove conditions within groups
- [ ] Actions section shows action list
- [ ] Can add/remove actions
- [ ] Action config fields render based on action type
- [ ] Templates section shows template editor
- [ ] Can add/edit templates (SMS, Email, Internal Message)
- [ ] Template preview updates live
- [ ] Schedule section shows schedule/throttle config

### Right Panel (Desktop) / Preview Tab (Mobile)
- [ ] Shows trigger preview
- [ ] Shows condition sentence view
- [ ] Shows action previews
- [ ] Shows message template previews if applicable
- [ ] Test Run button exists
- [ ] Run history mini panel shows recent runs

### Template Editor
- [ ] Variable list is visible
- [ ] Variables can be inserted into template
- [ ] Live preview with example data
- [ ] Validation warnings for missing/unknown variables
- [ ] Character count for SMS templates
- [ ] Formatting rules displayed

### Test Mode
- [ ] Test Run button opens test dialog
- [ ] Can select example entity (booking, client, sitter)
- [ ] Shows condition evaluation results
- [ ] Shows what actions would execute
- [ ] Shows message previews
- [ ] Does NOT send real messages
- [ ] Does NOT change real booking status
- [ ] Creates run with status "test"
- [ ] Test run appears in history

## Page: Run History (`/automations/[id]/runs`)

### Run List
- [ ] Shows all runs for automation
- [ ] Filters: Status, Date range
- [ ] Sortable by date
- [ ] Pagination for large lists

### Run Detail
- [ ] Trigger payload snapshot visible
- [ ] Condition evaluation results shown
- [ ] Actions executed with outputs shown
- [ ] Messages sent with content preview
- [ ] Idempotency key displayed
- [ ] Correlation ID to EventLog displayed
- [ ] Error messages shown if failed

## Universal UI Requirements

### Design System
- [ ] All components use design tokens only
- [ ] No page-specific hacks
- [ ] Shared primitives only
- [ ] Buttons look like buttons (rounded edges)
- [ ] Full width cards on mobile
- [ ] No dual scroll - one primary scroll

### Mobile Layout
- [ ] Same content as desktop
- [ ] Stacked layout instead of side-by-side
- [ ] Tabs work properly
- [ ] Touch targets are 44px minimum
- [ ] Text is readable (not too small)

### Functionality
- [ ] Save button works
- [ ] Cancel button works
- [ ] Form validation works
- [ ] Error messages display properly
- [ ] Success messages display properly
- [ ] Loading states show skeletons
- [ ] Empty states show helpful messages

## Integration Points

### Booking Integration
- [ ] Booking events trigger automations
- [ ] Booking data available in context
- [ ] Can preview with real booking data

### Messaging Integration
- [ ] Message events trigger automations
- [ ] Can send SMS through actions
- [ ] Templates work with messaging system

### Payroll Integration
- [ ] Payroll events trigger automations
- [ ] Payroll data available in context

### Sitter Integration
- [ ] Sitter events trigger automations
- [ ] Sitter data available in context

### EventLog Integration
- [ ] Every run creates EventLog entry
- [ ] Correlation ID links run to EventLog
- [ ] Audit trail is complete

## Safety Features

### Action Safety
- [ ] Destructive actions show preview: "Will do X to Y"
- [ ] Destructive actions require confirmation
- [ ] Idempotency keys prevent duplicates
- [ ] Test mode clearly marked

### Access Control
- [ ] "Allow live actions" toggle exists (admin only)
- [ ] Test mode available to all
- [ ] Only active automations can have live actions enabled

## Performance

- [ ] List page loads quickly (< 2s)
- [ ] Builder page loads quickly (< 2s)
- [ ] Preview updates smoothly
- [ ] No lag when typing in template editor
- [ ] Large run histories paginate properly

## Edge Cases

- [ ] Handles automations with no trigger
- [ ] Handles automations with no conditions
- [ ] Handles automations with no actions
- [ ] Handles automations with no templates
- [ ] Handles invalid trigger configs gracefully
- [ ] Handles invalid action configs gracefully
- [ ] Handles missing template variables gracefully
- [ ] Handles test runs with no example data
