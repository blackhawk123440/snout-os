# Phase 2: Pricing Unification - Current State Inventory

**Master Spec Reference**: Lines 241-251 (Phase 2), Lines 5.1-5.3 (Pricing System Design)

This document inventories all current pricing logic locations, display surfaces, and calculation methods to support Phase 2 implementation.

## Current Pricing Calculation Functions

### 1. `src/lib/rates.ts` - Core Quote Calculation
- **Function**: `computeQuote(i: QuoteInput): QuoteResult`
- **Purpose**: Core pricing calculation for base rates, holidays, additional pets
- **Returns**: `{ total: number, notes: string, holidayApplied: boolean }`
- **Used by**: `calculateBookingPrice()` function
- **Logic**: Handles base rates, holiday additions, additional pets, quantity multiplication

### 2. `src/lib/booking-utils.ts` - Price Breakdown Display
- **Function**: `calculatePriceBreakdown(booking): PriceBreakdown`
- **Purpose**: Creates detailed breakdown for UI display
- **Returns**: `PriceBreakdown` with `basePrice`, `additionalPets`, `holidayAdd`, `afterHoursAdd`, `quantity`, `total`, `breakdown[]`
- **Used by**: Booking details UI, payment links, SMS messages
- **Logic**: Calls `computeQuote` and formats results for display

### 3. `src/lib/pricing-engine.ts` - Pricing Rules Engine
- **Function**: `calculatePriceWithRules(basePrice, context): PricingResult`
- **Purpose**: Applies dynamic pricing rules (fees, discounts, multipliers) from database
- **Returns**: `PricingResult` with `basePrice`, `fees[]`, `discounts[]`, `multipliers[]`, `subtotal`, `total`
- **Used by**: Currently exists but not integrated into booking flow
- **Status**: EXISTS BUT NOT ACTIVELY USED in booking creation

### 4. `src/lib/rates.ts` - calculateBookingPrice Helper
- **Function**: `calculateBookingPrice(service, startAt, endAt, petCount, quantity, afterHours)`
- **Purpose**: Wrapper that fetches rates from DB and calls `computeQuote`
- **Used by**: Form submission route (`/api/form`)
- **Returns**: `QuoteResult` (same as `computeQuote`)

## Pricing Display Surfaces (Where Totals Are Shown)

### 1. Booking Form (Public)
- **Location**: `public/booking-form.html`
- **Source**: Calculated client-side or via API
- **Status**: Need to verify actual implementation

### 2. Owner/Admin Dashboard - Booking Details Modal
- **Location**: `src/app/bookings/page.tsx`
- **Method**: Uses `calculatePriceBreakdown()` from `booking-utils.ts`
- **Display**: Shows breakdown with base price, additional pets, holiday add, quantity, total
- **Priority**: **START HERE** (internal admin view per master spec line 249)

### 3. Owner/Admin Dashboard - Booking List
- **Location**: `src/app/bookings/page.tsx`
- **Method**: Uses `calculatePriceBreakdown()` or `totalPrice` from booking record
- **Display**: Shows total price in list view

### 4. Sitter Dashboard
- **Location**: `src/app/sitter-dashboard/page.tsx` and `src/app/sitter/page.tsx`
- **Method**: Uses `totalPrice` from booking record or `calculatePriceBreakdown()`
- **Display**: Shows booking total and sitter earnings (commission calculation)

### 5. Calendar Views
- **Location**: Various calendar components
- **Method**: Uses `totalPrice` from booking record
- **Display**: Shows booking total

### 6. Payment Link Generation
- **Location**: `src/app/api/payments/create-payment-link/route.ts`
- **Method**: Uses `calculatePriceBreakdown()` to get accurate total
- **Display**: Uses total for Stripe payment link amount

### 7. SMS Messages
- **Location**: `src/lib/sms-templates.ts`, `src/app/api/bookings/[id]/route.ts`
- **Method**: Uses `calculatePriceBreakdown()` or `totalPrice`
- **Display**: Shows total in booking confirmation messages

## Current Pricing Logic Flow

### Booking Creation Flow (`/api/form`)
1. Form payload received
2. `calculateBookingPrice()` called (from `rates.ts`)
   - Fetches rate from database
   - Calls `computeQuote()` with rate and booking details
   - Returns `{ total, notes, holidayApplied }`
3. `calculatePriceBreakdown()` called (from `booking-utils.ts`)
   - Uses `computeQuote()` internally
   - Formats breakdown for display
   - Returns `PriceBreakdown` object
4. `totalPrice` stored in booking record = `breakdown.total`

### Booking Display Flow
1. Booking fetched from database (includes `totalPrice`)
2. `calculatePriceBreakdown()` called with booking data
3. Breakdown displayed in UI

## Identified Issues (Per Master Spec 1.2.2)

> "Pricing logic diverges across surfaces, form, calendar, sitter dashboard, scripts"

**Confirmed Issues**:
- ✅ Multiple functions calculate pricing (`computeQuote`, `calculatePriceBreakdown`, `calculatePriceWithRules`)
- ✅ `calculatePriceBreakdown` is used for display but has its own logic
- ✅ `pricing-engine.ts` exists but is NOT integrated (dead code risk)
- ⚠️ No single source of truth - pricing can diverge between calculation and display
- ⚠️ No pricing snapshot storage (per master spec 5.2.1)

## Master Spec Requirements for Phase 2

### Canonical Pricing Breakdown Schema (Lines 5.1.1-5.1.7)
Must include:
1. Subtotal base services
2. Add ons
3. Fees
4. Discounts
5. Taxes (if applicable)
6. Total
7. Metadata (service codes, durations, quantities, policy flags)

### Current PriceBreakdown vs Required Schema
**Current** (`booking-utils.ts`):
```typescript
interface PriceBreakdown {
  basePrice: number;
  additionalPets: number;
  holidayAdd: number;
  afterHoursAdd: number;
  quantity: number;
  total: number;
  breakdown: Array<{ label: string; amount: number; description?: string }>;
}
```

**Gap**: Missing canonical structure with explicit subtotals, add-ons, fees, discounts, taxes, metadata

### Single Source of Truth Rules (Lines 5.2.1-5.2.4)
- ❌ Booking does NOT store `pricingSnapshot` field
- ❌ Surfaces do NOT read from stored snapshot
- ❌ Recompute rules not defined
- ❌ Override audit trail not implemented

## Phase 2 Implementation Plan

1. ✅ **Inventory Complete** (this document)
2. ⏳ **Design Canonical Schema** - Create schema matching lines 5.1.1-5.1.7
3. ⏳ **Implement PricingEngine v1** - Single function that outputs canonical breakdown
4. ⏳ **Create PricingParity Harness** - Compare old vs new, log differences
5. ⏳ **Add Feature Flag** - `USE_PRICING_ENGINE_V1` default false
6. ⏳ **Integrate into Booking Creation** - Store `pricingSnapshot` when flag true
7. ⏳ **Start with Admin View** - Booking details modal uses snapshot when flag true
8. ⏳ **Expand to Other Surfaces** - One at a time after verification

## Next Steps

1. Design canonical pricing breakdown schema
2. Implement PricingEngine v1
3. Create pricing snapshot storage (Prisma schema update)
4. Build parity harness for comparison
5. Add feature flag and integrate behind flag

