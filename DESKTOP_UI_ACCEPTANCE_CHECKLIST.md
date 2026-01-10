# Desktop UI Acceptance Checklist

**Status**: ⏳ IN PROGRESS - Verification Pending

## Viewports Required
- Desktop: 1024px, 1280px, 1440px
- Mobile: 390x844 (iPhone 12), 430x932 (iPhone 14 Pro Max)

---

## Pages to Verify

### Dashboard Home
| Viewport | No Horizontal Scroll | Headers/Filters Not Overlapping | Buttons Look Like Buttons | Primary Actions Visible | Status |
|----------|---------------------|--------------------------------|---------------------------|------------------------|--------|
| 1024px   | ⏳ Pending          | ⏳ Pending                      | ⏳ Pending                | ⏳ Pending              | ⏳      |
| 1280px   | ⏳ Pending          | ⏳ Pending                      | ⏳ Pending                | ⏳ Pending              | ⏳      |
| 1440px   | ⏳ Pending          | ⏳ Pending                      | ⏳ Pending                | ⏳ Pending              | ⏳      |
| 390x844  | ⏳ Pending          | ⏳ Pending                      | ⏳ Pending                | ⏳ Pending              | ⏳      |
| 430x932  | ⏳ Pending          | ⏳ Pending                      | ⏳ Pending                | ⏳ Pending              | ⏳      |

### Bookings List
| Viewport | No Horizontal Scroll | Sticky Filters Work | Table Scan Friendly | Row Click Works | Assign Actions | Status |
|----------|---------------------|---------------------|---------------------|-----------------|---------------|--------|
| 1024px   | ⏳ Pending          | ⏳ Pending          | ⏳ Pending          | ⏳ Pending       | ✅ BookingRowActions | ⏳      |
| 1280px   | ⏳ Pending          | ⏳ Pending          | ⏳ Pending          | ⏳ Pending       | ✅ BookingRowActions | ⏳      |
| 1440px   | ⏳ Pending          | ⏳ Pending          | ⏳ Pending          | ⏳ Pending       | ✅ BookingRowActions | ⏳      |
| 390x844  | ⏳ Pending          | ✅ Cards Not Table  | ⏳ Pending          | ⏳ Pending       | ✅ BookingRowActions | ⏳      |
| 430x932  | ⏳ Pending          | ✅ Cards Not Table  | ⏳ Pending          | ⏳ Pending       | ✅ BookingRowActions | ⏳      |

**Notes**: Sticky filters implemented. Mobile uses cards. Desktop uses table with sticky header. BookingRowActions component provides assign/unassign actions on both mobile and desktop.

### Booking Detail
| Viewport | Two Column Desktop | Sticky Summary Header | No Duplicate Headers | Edit Modal Works | Status |
|----------|-------------------|----------------------|---------------------|------------------|--------|
| 1024px   | ✅ Implemented     | ✅ Implemented        | ✅ Verified         | ✅ Uses BookingForm | ⏳      |
| 1280px   | ✅ Implemented     | ✅ Implemented        | ✅ Verified         | ✅ Uses BookingForm | ⏳      |
| 1440px   | ✅ Implemented     | ✅ Implemented        | ✅ Verified         | ✅ Uses BookingForm | ⏳      |
| 390x844  | N/A               | ✅ Implemented        | ✅ Verified         | ✅ Uses BookingForm | ⏳      |
| 430x932  | N/A               | ✅ Implemented        | ✅ Verified         | ✅ Uses BookingForm | ⏳      |

**Notes**: Two-column desktop layout with intelligence (left) and controls (right). Sticky summary header. Mobile layout with collapsible sections. Edit modal uses unified BookingForm component.

### Calendar
| Viewport | Agenda Panel (Desktop) | Booking Drawer Works | Calendar Grid Readable | Status |
|----------|------------------------|---------------------|------------------------|--------|
| 1024px   | ✅ Implemented         | ⏳ Pending           | ⏳ Pending             | ⏳      |
| 1280px   | ✅ Implemented         | ⏳ Pending           | ⏳ Pending             | ⏳      |
| 1440px   | ✅ Implemented         | ⏳ Pending           | ⏳ Pending             | ⏳      |
| 390x844  | N/A                    | ✅ Modal Works       | ⏳ Pending             | ⏳      |
| 430x932  | N/A                    | ✅ Modal Works       | ⏳ Pending             | ⏳      |

**Notes**: Desktop three-column layout (Agenda 320px + Calendar 1fr + Drawer 480px). Mobile uses modal.

### Clients List
| Viewport | Sticky Filters | Table/Cards Work | Row Click Works | Status |
|----------|---------------|------------------|-----------------|--------|
| 1024px   | ✅ Implemented | ⏳ Pending        | ⏳ Pending       | ⏳      |
| 1280px   | ✅ Implemented | ⏳ Pending        | ⏳ Pending       | ⏳      |
| 1440px   | ✅ Implemented | ⏳ Pending        | ⏳ Pending       | ⏳      |
| 390x844  | ✅ MobileFilterBar | ✅ Cards      | ⏳ Pending       | ⏳      |
| 430x932  | ✅ MobileFilterBar | ✅ Cards      | ⏳ Pending       | ⏳      |

**Notes**: Sticky filter rail on desktop. MobileFilterBar on mobile. Table on desktop, cards on mobile.

### Client Detail
| Viewport | Two Column Desktop | Profile/Stats Visible | Booking History Works | Status |
|----------|-------------------|----------------------|----------------------|--------|
| 1024px   | ✅ Implemented     | ⏳ Pending            | ⏳ Pending            | ⏳      |
| 1280px   | ✅ Implemented     | ⏳ Pending            | ⏳ Pending            | ⏳      |
| 1440px   | ✅ Implemented     | ⏳ Pending            | ⏳ Pending            | ⏳      |
| 390x844  | N/A               | ⏳ Pending            | ⏳ Pending            | ⏳      |
| 430x932  | N/A               | ⏳ Pending            | ⏳ Pending            | ⏳      |

**Notes**: Two-column layout with bookings (left) and profile/actions (right). Mobile stacked layout.

### Sitter Dashboard
| Viewport | Right Panel Desktop | Calendar Parity | Stats Visible | Status |
|----------|---------------------|-----------------|---------------|--------|
| 1024px   | ✅ Implemented      | ✅ Same CalendarGrid | ⏳ Pending  | ⏳      |
| 1280px   | ✅ Implemented      | ✅ Same CalendarGrid | ⏳ Pending  | ⏳      |
| 1440px   | ✅ Implemented      | ✅ Same CalendarGrid | ⏳ Pending  | ⏳      |
| 390x844  | N/A                 | ✅ Same CalendarGrid | ⏳ Pending  | ⏳      |
| 430x932  | N/A                 | ✅ Same CalendarGrid | ⏳ Pending  | ⏳      |

**Notes**: Desktop right panel (400px) with today summary, upcoming bookings, quick actions, earnings. Calendar uses shared CalendarGrid.

### Automations
| Viewport | No Horizontal Scroll | Cards Readable | Message Preview Fills | Status |
|----------|---------------------|----------------|----------------------|--------|
| 1024px   | ⏳ Pending          | ⏳ Pending      | ✅ Implemented        | ⏳      |
| 1280px   | ⏳ Pending          | ⏳ Pending      | ✅ Implemented        | ⏳      |
| 1440px   | ⏳ Pending          | ⏳ Pending      | ✅ Implemented        | ⏳      |
| 390x844  | ⏳ Pending          | ⏳ Pending      | ✅ Implemented        | ⏳      |
| 430x932  | ⏳ Pending          | ⏳ Pending      | ✅ Implemented        | ⏳      |

**Notes**: MessageTemplatePreview component ensures proper wrapping and sizing.

### Payments
| Viewport | KPI Cards Fixed Height | Transactions Table | No Fake Charts | Stripe Truth | Status |
|----------|------------------------|-------------------|----------------|--------------|--------|
| 1024px   | ✅ Implemented         | ⏳ Pending         | ⏳ Pending      | ⏳ Partial    | ⏳      |
| 1280px   | ✅ Implemented         | ⏳ Pending         | ⏳ Pending      | ⏳ Partial    | ⏳      |
| 1440px   | ✅ Implemented         | ⏳ Pending         | ⏳ Pending      | ⏳ Partial    | ⏳      |
| 390x844  | ✅ Implemented         | ⏳ Cards           | ⏳ Pending      | ⏳ Partial    | ⏳      |
| 430x932  | ✅ Implemented         | ⏳ Cards           | ⏳ Pending      | ⏳ Partial    | ⏳      |

**Notes**: KPI cards use StatCard with fixed height. Stripe models exist, sync job exists, but UI needs wiring to StripeCharge/StripeRefund/StripePayout tables.

### Payroll
| Viewport | Pay Period Selector | Payouts Table | Adjustments UI | Export CSV | Status |
|----------|-------------------|---------------|----------------|------------|--------|
| 1024px   | ⏳ Pending         | ⏳ Pending     | ⏳ Pending      | ⏳ Pending  | ⏳      |
| 1280px   | ⏳ Pending         | ⏳ Pending     | ⏳ Pending      | ⏳ Pending  | ⏳      |
| 1440px   | ⏳ Pending         | ⏳ Pending     | ⏳ Pending      | ⏳ Pending  | ⏳      |
| 390x844  | ⏳ Pending         | ⏳ Pending     | ⏳ Pending      | ⏳ Pending  | ⏳      |
| 430x932  | ⏳ Pending         | ⏳ Pending     | ⏳ Pending      | ⏳ Pending  | ⏳      |

**Notes**: PayrollRun/PayrollLineItem/PayrollAdjustment models exist. UI needs wiring and computation service.

### Sitters Admin List
| Viewport | Sticky Filters | Table Works | Tier Filter Works | Row Click Works | Status |
|----------|---------------|-------------|-------------------|-----------------|--------|
| 1024px   | ✅ Implemented | ⏳ Pending   | ✅ Implemented     | ⏳ Pending       | ⏳      |
| 1280px   | ✅ Implemented | ⏳ Pending   | ✅ Implemented     | ⏳ Pending       | ⏳      |
| 1440px   | ✅ Implemented | ⏳ Pending   | ✅ Implemented     | ⏳ Pending       | ⏳      |
| 390x844  | ✅ MobileFilterBar | ✅ Cards | ✅ Implemented     | ⏳ Pending       | ⏳      |
| 430x932  | ✅ MobileFilterBar | ✅ Cards | ✅ Implemented     | ⏳ Pending       | ⏳      |

**Notes**: Sticky filter rail with search, tier filter, active filter, sort. Table on desktop, cards on mobile. Row click navigates to `/sitters/[id]`.

### Sitter Detail
| Viewport | Tier Badge Visible | Upcoming Bookings | Payroll Snapshot Link | Status |
|----------|-------------------|-------------------|----------------------|--------|
| 1024px   | ✅ Implemented     | ✅ Implemented     | ✅ Implemented        | ⏳      |
| 1280px   | ✅ Implemented     | ✅ Implemented     | ✅ Implemented        | ⏳      |
| 1440px   | ✅ Implemented     | ✅ Implemented     | ✅ Implemented        | ⏳      |
| 390x844  | ✅ Implemented     | ✅ Implemented     | ✅ Implemented        | ⏳      |
| 430x932  | ✅ Implemented     | ✅ Implemented     | ✅ Implemented        | ⏳      |

**Notes**: Two-column desktop layout. Tier badge, upcoming bookings, payroll snapshot link, messaging entry point all implemented.

---

## Legend
- ✅ Implemented - Code exists and typechecks
- ⏳ Pending - Needs visual verification or completion
- ❌ Fail - Known issue
- N/A - Not applicable for this viewport

## Next Steps
1. Visual verification on all viewports
2. Test all interactions (click, scroll, filter)
3. Verify no horizontal scroll
4. Verify buttons are tappable/clickable
5. Mark each item as ✅ Pass or ❌ Fail with notes
