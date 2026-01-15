# UI Standards - UI Constitution V1

Comprehensive interaction and design standards for the UI kit.

## Scroll Rules

### Single Scroll Surface
- **Rule**: Only `PageShell` component can scroll vertically
- **Implementation**: PageShell sets `overflowY: 'auto'` on inner container, `overflow: 'hidden'` on outer container
- **Why**: Prevents scroll conflicts, ensures predictable scrolling behavior
- **Exception**: Internal scroll allowed in:
  - Modal, Drawer, BottomSheet content areas (overlay components)
  - DataTable body when `fixedHeader={true}`
  - SideNav nav items list

### Horizontal Scroll Prevention
- **Rule**: No horizontal scroll allowed except in approved table components
- **Implementation**: All containers use `overflowX: 'hidden'` or no overflow
- **Exception**: DataTable can scroll horizontally if content exceeds viewport

### Scroll Behavior
- **Rule**: Smooth scrolling where appropriate
- **Implementation**: `scrollBehavior: 'smooth'` on PageShell
- **Mobile**: `-webkit-overflow-scrolling: touch` for iOS momentum scrolling

## Layout Rules

### Page Structure
```
PageShell (scroll surface)
  ├── TopBar (fixed height, no scroll)
  ├── SideNav (desktop) / Drawer trigger (mobile)
  └── Content Area (scrolls within PageShell)
      ├── Section
      │   └── Grid
      │       └── Grid.Col
      └── ...
```

### Max Width
- **Rule**: Content max width controlled by PageShell
- **Default**: `1400px` (from `tokens.layout.appShell.contentMaxWidth`)
- **Customizable**: Via PageShell `maxWidth` prop

### Padding
- **Rule**: Page padding controlled by PageShell
- **Default**: `tokens.spacing[6]` (24px)
- **Can be disabled**: Set `padding={false}` on PageShell

### Vertical Rhythm
- **Rule**: Consistent spacing between sections
- **Implementation**: Sections use `tokens.spacing[6]` for bottom margin
- **With divider**: Additional spacing when `divider={true}`

## Breakpoints and Responsive Behavior

### Breakpoint Tokens
```typescript
sm: '640px'   // Mobile
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large
```

### Mobile-First Approach
- **Rule**: Default styles are mobile, desktop enhanced
- **Implementation**: Use `useMobile()` hook to detect viewport
- **Components**: Most components have mobile-specific behavior

### Responsive Patterns

#### Grid Columns
```tsx
<Grid.Col span={12} md={6} lg={4} />
// Mobile: 12 columns (full width)
// Tablet: 6 columns (half width)
// Desktop: 4 columns (one-third width)
```

#### SideNav Behavior
- **Desktop**: Fixed panel on left side
- **Mobile**: Becomes Drawer trigger, opens as Drawer overlay

#### Modal Behavior
- **Desktop**: Centered modal dialog
- **Mobile**: Full-height bottom sheet

#### Table to Card Transformation
- **Desktop**: DataTable with columns
- **Mobile**: CardList with card-based layout

## Table to Card Transformations

### When to Transform
- **Automatic**: DataTable automatically uses CardList on mobile
- **Manual**: Use CardList component for custom mobile layouts

### Transformation Rules
1. **Desktop**: Table with sortable columns, fixed header option
2. **Mobile**: Cards with stacked label-value pairs
3. **Column Mapping**: `mobileLabel` and `mobileOrder` props control mobile display
4. **Consistent Data**: Same data source, different presentation

### Card Structure
```tsx
<Card>
  <CardHeader>Row Title</CardHeader>
  <CardBody>
    <LabelValue label="Field 1" value={row.field1} />
    <LabelValue label="Field 2" value={row.field2} />
  </CardBody>
  <CardActions>Actions</CardActions>
</Card>
```

## Modal and Drawer Behavior

### Modal
- **Desktop**: Centered dialog, max-width controlled, backdrop blur
- **Mobile**: Full-height bottom sheet
- **Behavior**: 
  - Escape key closes
  - Backdrop click closes (configurable)
  - Focus trap active
  - Body scroll locked

### Drawer
- **Placement**: Left or right
- **Width**: Tokenized (`tokens.layout.appShell.sidebarWidth`)
- **Mobile**: Default pattern for navigation
- **Behavior**:
  - Escape key closes
  - Backdrop click closes
  - Slide animation
  - Body scroll locked

### BottomSheet
- **Usage**: Mobile primary overlay pattern
- **Behavior**:
  - Slides up from bottom
  - Optional drag handle
  - Escape key closes
  - Body scroll locked
  - Max height: 90vh

## Loading Skeleton Rules

### When to Show
- **Data fetching**: Show skeleton while loading
- **Form submission**: Show skeleton on submit button
- **Route transitions**: Optional, show skeleton for slow routes

### Skeleton Patterns
- **Text**: Use `variant="text"` for paragraph placeholders
- **Rectangular**: Use `variant="rectangular"` for cards/images
- **Circular**: Use `variant="circular"` for avatars

### Reduced Motion
- **Rule**: Respect `prefers-reduced-motion`
- **Implementation**: Skeleton checks media query, disables animation if reduced motion preferred
- **Fallback**: Static background color when animation disabled

### Skeleton Count
- **Rule**: Show 3-5 skeleton items (enough to indicate loading, not overwhelming)
- **Example**: `{loading ? [1,2,3,4,5].map(i => <Skeleton key={i} />) : data}`

## Empty and Error Handling Rules

### Empty State
- **When**: No data available, no items found
- **Components**: Use `EmptyState` component
- **Content**:
  - Icon (optional, contextual)
  - Title (required, descriptive)
  - Description (optional, helpful)
  - Action button (optional, primary action)

### Error State
- **When**: Failed to load, API error, validation error
- **Components**: Use `ErrorState` component
- **Content**:
  - Error icon (automatic if not provided)
  - Title (default: "Something went wrong")
  - Message (error details)
  - Retry action (recommended)

### Inline Errors
- **Forms**: Show error below input field
- **Implementation**: `error` prop on Input, Select, Textarea
- **Accessibility**: `aria-describedby` links error to input
- **No Layout Shift**: Error message space reserved to prevent shift

## Motion Rules

### Duration Tokens
```typescript
fast: '150ms'   // Hover states, quick feedback
normal: '200ms' // Standard transitions
slow: '300ms'   // Toast dismiss, modal animations
```

### Easing Tokens
```typescript
standard: 'cubic-bezier(0.4, 0, 0.2, 1)'      // Standard transitions
emphasized: 'cubic-bezier(0.2, 0, 0, 1)'      // Attention-grabbing
decelerated: 'cubic-bezier(0, 0, 0.2, 1)'     // Slow start
accelerated: 'cubic-bezier(0.4, 0, 1, 1)'     // Fast start
```

### Animation Guidelines
1. **Hover**: Fast duration, standard easing
2. **Focus**: Instant (no animation for accessibility)
3. **Transitions**: Normal duration, standard easing
4. **Overlays**: Slow duration for entry/exit
5. **Loading**: Continuous, respect reduced motion

### Reduced Motion
- **Rule**: All animations respect `prefers-reduced-motion: reduce`
- **Implementation**: Check media query before animating
- **Fallback**: Static state or minimal animation

## Accessibility Rules

### Keyboard Navigation
- **Rule**: All interactive components keyboard accessible
- **Tab Order**: Logical, sequential
- **Focus Visible**: All focusable elements have visible focus indicator
- **Shortcuts**: Common shortcuts (Enter, Space, Escape) supported

### ARIA Patterns
- **Labels**: All form inputs have associated labels
- **Descriptions**: Use `aria-describedby` for help text
- **States**: Use `aria-busy`, `aria-disabled`, `aria-expanded`, etc.
- **Roles**: Use semantic roles (`button`, `dialog`, `navigation`, etc.)

### Screen Reader Support
- **Icon-only buttons**: Require `aria-label`
- **Loading states**: Use `aria-busy={true}` and `aria-live`
- **Error messages**: Use `aria-live="polite"` or `"assertive"`
- **Modal dialogs**: Use `aria-modal="true"` and `role="dialog"`

### Focus Management
- **Modal/Drawer**: Focus trap active, focus returns to trigger on close
- **First focus**: First interactive element receives focus
- **Skip links**: Optional, for keyboard users to skip navigation

### Color Contrast
- **Rule**: WCAG AA minimum (4.5:1 for text, 3:1 for UI components)
- **Implementation**: Token colors designed to meet contrast requirements
- **Testing**: Use automated tools to verify contrast

### Touch Targets
- **Mobile**: Minimum 44x44px for all interactive elements
- **Implementation**: Components enforce minimum size on mobile
- **Spacing**: Adequate spacing between touch targets

## Component-Specific Rules

### Buttons
- **Loading**: Show spinner, disable interaction, update `aria-label`
- **Disabled**: Visual distinction, no interaction, keyboard focus allowed (for accessibility)
- **Variants**: Use semantic variants (primary for main action, destructive for delete)

### Forms
- **Validation**: Real-time or on submit (consistent per form)
- **Error Display**: Below field, red border, clear message
- **Required Fields**: Visual indicator (*), `aria-required`
- **Help Text**: Below label, above input

### Tables
- **Sortable**: Clear visual indicator, keyboard accessible
- **Row Actions**: IconButton with tooltip or dropdown
- **Empty State**: Show EmptyState component, not empty table
- **Loading**: Show skeleton rows, not spinner

### Overlays
- **Focus Trap**: Keep focus within overlay
- **Escape**: Always closeable via Escape key
- **Backdrop**: Dismissible via backdrop click (configurable)
- **Body Lock**: Prevent body scroll when open

## Token Usage Rules

### Color Tokens
- **Surface**: Use `tokens.colors.surface.*` for backgrounds
- **Text**: Use `tokens.colors.text.*` for text colors
- **Border**: Use `tokens.colors.border.*` for borders
- **Accent**: Use `tokens.colors.accent.*` for highlights

### Spacing Tokens
- **Rule**: Always use `tokens.spacing[0..12]`, never hardcoded values
- **Pattern**: Increment by 1-2 for related spacing
- **Example**: `gap: tokens.spacing[4]`, `padding: tokens.spacing[6]`

### Typography
- **Font Sizes**: Use `tokens.typography.fontSize.*`
- **Font Weights**: Use `tokens.typography.fontWeight.*`
- **Line Heights**: Included in fontSize token arrays

### No Hardcoded Values
- ❌ No `px`, `rem`, `%`, `vh`, `vw` values
- ❌ No hex colors (`#...`)
- ❌ No `rgba()` or `rgb()` values
- ✅ Use tokens only

## Performance Rules

### Bundle Size
- **Rule**: Keep component size minimal
- **Implementation**: Code splitting, tree shaking, minimal dependencies
- **Target**: < 5MB total JS bundle (enforced by Lighthouse CI)

### Rendering
- **Rule**: Minimize re-renders
- **Implementation**: React.memo where appropriate, stable callbacks
- **Lazy Loading**: Large components can be lazy loaded

### Animations
- **Rule**: Use CSS animations, not JavaScript
- **Implementation**: CSS keyframes, transform/opacity only
- **Performance**: GPU-accelerated properties (transform, opacity)

## Testing Rules

### Visual Regression
- **Routes**: Test `/dashboard`, `/bookings`, `/calendar`, `/clients`, `/sitters`, `/automations`
- **Breakpoints**: 390px (mobile), 768px (tablet), 1280px (desktop)
- **Run**: `npm run test:ui:visual`

### Performance
- **LCP**: < 2.5s (Largest Contentful Paint)
- **INP**: < 200ms (Interaction to Next Paint)
- **CLS**: < 0.1 (Cumulative Layout Shift)
- **Run**: `npm run lighthouse:ci`

### Accessibility
- **Automated**: Use axe-core or similar
- **Manual**: Keyboard navigation, screen reader testing
- **WCAG**: AA level minimum compliance

## Compliance

All components and pages must follow these standards. Violations will fail CI checks.

### Enforcement
- **Automated**: `npm run check:ui-constitution`
- **Visual**: Playwright visual regression tests
- **Performance**: Lighthouse CI budgets
- **Manual**: Code review

### Review Process
1. Run `npm run check:ui-constitution`
2. Run visual regression tests
3. Run Lighthouse CI
4. Manual accessibility audit
5. Review against this document
