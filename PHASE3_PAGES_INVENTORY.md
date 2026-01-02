# Phase 3: Complete Page Migration Inventory

**Last Updated**: 2024-12-30
**Total Pages in App**: 34 pages
**Dashboard Pages to Migrate**: 28 pages
**Excluded (Client-Facing)**: 6 pages

---

## Migration Strategy

1. **Phase 3.1**: Observational pages (8) - **START with Dashboard `/`**
2. **Phase 3.2**: Analytical pages (2)
3. **Phase 3.3**: Configuration pages (13)
4. **Phase 3.4**: Operational pages (5)

**Key Rule**: Dashboard (`/`) is the canonical reference and must be done FIRST. Every other page inherits from it.

---

## Phase 3.1: Observational Pages (8 pages)
**Posture**: Calm, wide layouts, slow ambient motion, stable data presentation

1. **`/` (Dashboard Home)** ⭐ **CANONICAL REFERENCE - DO FIRST**
   - File: `src/app/page.tsx`

2. `/calendar`
   - File: `src/app/calendar/page.tsx`

3. `/clients`
   - File: `src/app/clients/page.tsx`

4. `/messages`
   - File: `src/app/messages/page.tsx`

5. `/templates`
   - File: `src/app/templates/page.tsx`

6. `/integrations`
   - File: `src/app/integrations/page.tsx`

7. `/sitter`
   - File: `src/app/sitter/page.tsx`

8. `/sitter-dashboard`
   - File: `src/app/sitter-dashboard/page.tsx`

---

## Phase 3.2: Analytical Pages (2 pages)
**Posture**: Sharper, tighter spacing, elastic charts, responsive transitions

1. `/payments`
   - File: `src/app/payments/page.tsx`

2. `/settings/automations/ledger`
   - File: `src/app/settings/automations/ledger/page.tsx`

---

## Phase 3.3: Configuration Pages (13 pages)
**Posture**: Maximum stability, minimal motion, strong spatial separation

1. `/settings`
   - File: `src/app/settings/page.tsx`

2. `/settings/business`
   - File: `src/app/settings/business/page.tsx`

3. `/settings/pricing`
   - File: `src/app/settings/pricing/page.tsx`

4. `/settings/services`
   - File: `src/app/settings/services/page.tsx`

5. `/settings/discounts`
   - File: `src/app/settings/discounts/page.tsx`

6. `/settings/tiers`
   - File: `src/app/settings/tiers/page.tsx`

7. `/settings/custom-fields`
   - File: `src/app/settings/custom-fields/page.tsx`

8. `/settings/form-builder`
   - File: `src/app/settings/form-builder/page.tsx`

9. `/automation`
   - File: `src/app/automation/page.tsx`

10. `/automation-center`
    - File: `src/app/automation-center/page.tsx`

11. `/automation-center/new`
    - File: `src/app/automation-center/new/page.tsx`

12. `/automation-center/[id]`
    - File: `src/app/automation-center/[id]/page.tsx`

13. `/calendar/accounts`
    - File: `src/app/calendar/accounts/page.tsx`

---

## Phase 3.4: Operational Pages (5 pages)
**Posture**: Execution-focused, reduced ambient motion, clear action zones

1. `/bookings`
   - File: `src/app/bookings/page.tsx`

2. `/bookings/[id]`
   - File: `src/app/bookings/[id]/page.tsx`

3. `/bookings/sitters`
   - File: `src/app/bookings/sitters/page.tsx`

4. `/exceptions`
   - File: `src/app/exceptions/page.tsx`

5. `/templates/[id]`
   - File: `src/app/templates/[id]/page.tsx`

---

## Excluded Pages (Client-Facing, NOT Dashboard)

These pages are **NOT** part of the dashboard system and should **NOT** be migrated:

1. `/login`
   - File: `src/app/login/page.tsx`
   - Reason: Authentication page, client-facing

2. `/tip/[amount]/[sitter]`
   - File: `src/app/tip/[amount]/[sitter]/page.tsx`
   - Reason: Client-facing payment flow

3. `/tip/cancel`
   - File: `src/app/tip/cancel/page.tsx`
   - Reason: Client-facing payment flow

4. `/tip/link-builder`
   - File: `src/app/tip/link-builder/page.tsx`
   - Reason: Client-facing payment flow

5. `/tip/payment`
   - File: `src/app/tip/payment/page.tsx`
   - Reason: Client-facing payment flow

6. `/tip/success`
   - File: `src/app/tip/success/page.tsx`
   - Reason: Client-facing payment flow

---

## Summary by Category

**Dashboard Pages to Migrate**: **28 pages total**

- **Observational (3.1)**: 8 pages
  - `/` (Dashboard) ⭐ **START HERE**
  - `/calendar`
  - `/clients`
  - `/messages`
  - `/templates`
  - `/integrations`
  - `/sitter`
  - `/sitter-dashboard`

- **Analytical (3.2)**: 2 pages
  - `/payments`
  - `/settings/automations/ledger`

- **Configuration (3.3)**: 13 pages
  - `/settings`
  - `/settings/business`
  - `/settings/pricing`
  - `/settings/services`
  - `/settings/discounts`
  - `/settings/tiers`
  - `/settings/custom-fields`
  - `/settings/form-builder`
  - `/automation`
  - `/automation-center`
  - `/automation-center/new`
  - `/automation-center/[id]`
  - `/calendar/accounts`

- **Operational (3.4)**: 5 pages
  - `/bookings`
  - `/bookings/[id]`
  - `/bookings/sitters`
  - `/exceptions`
  - `/templates/[id]`

**Excluded (Client-Facing)**: 6 pages
- `/login`
- `/tip/*` (5 routes)

---

## Migration Notes

- Each page maintains all business logic and API calls (no behavior changes)
- Layout structure and component responsibilities remain unchanged
- Only visual system evolves (colors → white + pink, motion → posture-aware, depth/opacity)
- Legacy backup files (`page-legacy.tsx`) should be preserved
- Dashboard (`/`) is the genetic baseline - all other pages inherit from it
