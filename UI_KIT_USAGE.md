# UI Kit Usage Guide
## UI Constitution V1

Complete usage examples for all UI kit components. All components are production-ready, accessible, and token-only.

## Layout Primitives

### PageShell
Single allowed scroll surface for any route. Owns page padding, max width, background, and vertical rhythm.

```tsx
import { PageShell } from '@/components/ui';

<PageShell>
  <TopBar title="Dashboard" />
  <SideNav items={navItems} />
  <main>Your content here</main>
</PageShell>
```

**Important**: PageShell is the ONLY component that should scroll vertically. All page layouts must use this.

### TopBar
Fixed height navigation bar with title, breadcrumb, and action slots.

```tsx
import { TopBar } from '@/components/ui';

<TopBar
  title="Dashboard"
  breadcrumb={[
    { label: 'Home', href: '/' },
    { label: 'Dashboard' }
  ]}
  leftActions={<Button>Back</Button>}
  rightActions={<Button>Settings</Button>}
/>
```

### SideNav
Desktop fixed panel navigation. Mobile becomes Drawer trigger.

```tsx
import { SideNav } from '@/components/ui';

<SideNav
  items={[
    { label: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
    { label: 'Bookings', href: '/bookings', icon: <CalendarIcon /> },
  ]}
  activeRoute="/dashboard"
  collapsed={false}
  onCollapseToggle={(collapsed) => {}}
/>
```

### Section
Standard section with heading, subheading, actions slot, and optional divider.

```tsx
import { Section } from '@/components/ui';

<Section
  heading="Bookings"
  subheading="Manage your bookings"
  actions={<Button>Add Booking</Button>}
  divider
>
  <BookingList />
</Section>
```

### Grid
Locked 12 column grid for desktop. On mobile collapses to 1 column.

```tsx
import { Grid } from '@/components/ui';

<Grid gap={4}>
  <Grid.Col span={12} md={6} lg={4}>
    <Card>Item 1</Card>
  </Grid.Col>
  <Grid.Col span={12} md={6} lg={4}>
    <Card>Item 2</Card>
  </Grid.Col>
  <Grid.Col span={12} md={6} lg={4}>
    <Card>Item 3</Card>
  </Grid.Col>
</Grid>
```

## Surface Components

### FrostedCard
Frosted glass effect card with token blur, border, shadow, radius.

```tsx
import { FrostedCard } from '@/components/ui';

<FrostedCard
  interactive
  header={<h3>Card Title</h3>}
  footer={<Button>Action</Button>}
  onClick={() => {}}
>
  Card content goes here
</FrostedCard>
```

### Panel
Non-frosted surface for dense data zones. Used for table containers and calendar surfaces.

```tsx
import { Panel } from '@/components/ui';

<Panel padding={6}>
  <DataTable columns={columns} data={data} />
</Panel>
```

### StatCard
Metric display card with label, value, delta (optional), and icon (optional).

```tsx
import { StatCard } from '@/components/ui';

<StatCard
  label="Total Revenue"
  value="$12,345"
  delta={{ value: 12, trend: 'up' }}
  icon={<DollarIcon />}
  loading={false}
/>
```

## Controls

### Button
Variants: primary, secondary, ghost, destructive. Sizes: sm, md, lg.

```tsx
import { Button } from '@/components/ui';

<Button
  variant="primary"
  size="md"
  isLoading={false}
  leftIcon={<PlusIcon />}
  onClick={() => {}}
>
  Click me
</Button>
```

### IconButton
Icon-only button with variants, sizes, loading state.

```tsx
import { IconButton } from '@/components/ui';

<IconButton
  icon={<CloseIcon />}
  variant="ghost"
  size="md"
  aria-label="Close dialog"
  onClick={() => {}}
/>
```

### Input
Labels, descriptions, errors. Keyboard and screen reader friendly.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  description="Enter your email address"
  error="Invalid email"
  placeholder="example@email.com"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### Select
Labels, descriptions, errors. Consistent height and padding.

```tsx
import { Select } from '@/components/ui';

<Select
  label="Country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
  ]}
  value={selected}
  onChange={(e) => setSelected(e.target.value)}
/>
```

### Textarea
Labels, descriptions, errors. No layout shift when error appears.

```tsx
import { Textarea } from '@/components/ui';

<Textarea
  label="Message"
  description="Enter your message"
  rows={4}
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### Switch
Accessible toggle with label association.

```tsx
import { Switch } from '@/components/ui';

<Switch
  checked={enabled}
  onChange={(checked) => setEnabled(checked)}
  label="Enable notifications"
  description="Receive push notifications"
/>
```

### Tabs
Keyboard navigable with active indicator tokenized.

```tsx
import { Tabs, TabPanel } from '@/components/ui';

<Tabs
  tabs={[
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
  ]}
  activeTab="tab1"
  onTabChange={(tabId) => {}}
>
  <TabPanel id="tab1">Content 1</TabPanel>
  <TabPanel id="tab2">Content 2</TabPanel>
</Tabs>
```

### Badge
Status variants tokenized.

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">Active</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="warning">Warning</Badge>
```

### Tooltip
Accessible tooltip with tokenized delay.

```tsx
import { Tooltip } from '@/components/ui';

<Tooltip content="This is a tooltip" delay={200}>
  <Button>Hover me</Button>
</Tooltip>
```

## Overlays

### Modal
Trap focus, escape closes, mobile behavior defined, no background scroll.

```tsx
import { Modal } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure?</p>
</Modal>
```

### Drawer
Right and left placements. Mobile default.

```tsx
import { Drawer } from '@/components/ui';

<Drawer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Navigation"
  placement="right"
>
  <SideNav items={items} />
</Drawer>
```

### BottomSheet
Mobile primary overlay pattern with optional drag handle.

```tsx
import { BottomSheet } from '@/components/ui';

<BottomSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Actions"
  dragHandle
>
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</BottomSheet>
```

### Toast
Queue, variants, dismiss, duration tokenized.

```tsx
import { ToastProvider, useToast } from '@/components/ui';

function MyComponent() {
  const { showToast } = useToast();

  return (
    <Button
      onClick={() =>
        showToast({
          message: 'Success!',
          variant: 'success',
          duration: 3000,
        })
      }
    >
      Show Toast
    </Button>
  );
}

// Wrap your app with ToastProvider
<ToastProvider>
  <MyApp />
</ToastProvider>
```

## Data Components

### DataRow
Label-value layout with optional copy affordance and truncation rules.

```tsx
import { DataRow } from '@/components/ui';

<DataRow
  label="Email"
  value="user@example.com"
  copyable
  truncate
/>
```

### DataTable
Desktop data table with optional fixed header and internal body scroll.

```tsx
import { DataTable } from '@/components/ui';

<DataTable
  columns={[
    {
      key: 'name',
      header: 'Name',
      render: (row) => row.name,
      sortable: true,
    },
  ]}
  data={data}
  sortable
  loading={loading}
  onSort={(column, direction) => {}}
  rowActions={(row) => <IconButton icon={<MenuIcon />} />}
/>
```

### CardList
Mobile transformation for data tables. Displays data as cards on mobile.

```tsx
import { CardList } from '@/components/ui';

<CardList
  items={items}
  renderCard={(item) => <Card>{item.name}</Card>}
  emptyMessage="No items found"
  loading={loading}
/>
```

### Skeleton
Tokenized shimmer with reduced motion support.

```tsx
import { Skeleton } from '@/components/ui';

<Skeleton height="100px" width="100%" />
```

### EmptyState
Action slots and consistent visuals.

```tsx
import { EmptyState } from '@/components/ui';

<EmptyState
  title="No items"
  description="Add your first item to get started"
  action={<Button>Add Item</Button>}
  icon={<EmptyIcon />}
/>
```

### ErrorState
Action slots and consistent visuals.

```tsx
import { ErrorState } from '@/components/ui';

<ErrorState
  title="Something went wrong"
  message="Failed to load data"
  action={<Button onClick={retry}>Retry</Button>}
/>
```

## Complete Page Example

```tsx
import {
  PageShell,
  TopBar,
  Section,
  Grid,
  StatCard,
  Button,
  DataTable,
} from '@/components/ui';

export default function DashboardPage() {
  return (
    <PageShell>
      <TopBar title="Dashboard" />
      
      <Section heading="Overview" divider>
        <Grid gap={4}>
          <Grid.Col span={12} md={6} lg={3}>
            <StatCard
              label="Revenue"
              value="$12,345"
              delta={{ value: 12, trend: 'up' }}
            />
          </Grid.Col>
          <Grid.Col span={12} md={6} lg={3}>
            <StatCard
              label="Bookings"
              value="234"
              delta={{ value: 5, trend: 'down' }}
            />
          </Grid.Col>
        </Grid>
      </Section>

      <Section heading="Recent Bookings" actions={<Button>View All</Button>}>
        <DataTable
          columns={columns}
          data={bookings}
          sortable
        />
      </Section>
    </PageShell>
  );
}
```

## Rules

1. **No styling in pages**: Pages must only compose UI kit components
2. **PageShell is required**: All routes must use PageShell as the root
3. **Single scroll surface**: Only PageShell can scroll vertically
4. **Tokens only**: All values come from tokens - no hardcoded px, rem, hex, etc.
5. **Accessibility required**: All interactive components support keyboard navigation
6. **Loading states**: Components with async data must show loading states
7. **Error handling**: Components must handle error and empty states
