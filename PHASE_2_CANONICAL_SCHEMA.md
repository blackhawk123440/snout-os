# Phase 2: Canonical Pricing Breakdown Schema

**Master Spec Reference**: Lines 5.1.1-5.1.7 (Pricing System Design)

This document defines the canonical pricing breakdown schema that will be the single source of truth.

## Schema Requirements (Per Master Spec Lines 5.1.1-5.1.7)

1. ✅ Subtotal base services
2. ✅ Add ons
3. ✅ Fees
4. ✅ Discounts
5. ✅ Taxes (if applicable)
6. ✅ Total
7. ✅ Metadata (service codes, durations, quantities, policy flags)

## Canonical Pricing Breakdown Schema

```typescript
/**
 * Canonical Pricing Breakdown Schema
 * 
 * This is the single source of truth for pricing calculations.
 * All surfaces must use this structure when USE_PRICING_ENGINE_V1 is enabled.
 */
export interface CanonicalPricingBreakdown {
  // 5.1.1: Subtotal base services
  subtotalBaseServices: number;
  
  // 5.1.2: Add ons
  addOns: Array<{
    name: string;
    amount: number;
    type: "additional_pet" | "holiday" | "after_hours" | "rush" | "travel" | "custom";
    description?: string;
  }>;
  addOnsTotal: number;
  
  // 5.1.3: Fees
  fees: Array<{
    name: string;
    amount: number;
    type: "service_fee" | "platform_fee" | "transaction_fee" | "custom";
    description?: string;
  }>;
  feesTotal: number;
  
  // 5.1.4: Discounts
  discounts: Array<{
    name: string;
    amount: number;
    type: "promo_code" | "loyalty" | "volume" | "manual" | "custom";
    description?: string;
  }>;
  discountsTotal: number;
  
  // 5.1.5: Taxes (if applicable)
  taxes: Array<{
    name: string;
    amount: number;
    rate: number; // Percentage rate
    type: "sales_tax" | "service_tax" | "custom";
    description?: string;
  }>;
  taxesTotal: number;
  
  // 5.1.6: Total
  total: number;
  
  // 5.1.7: Metadata (service codes, durations, quantities, policy flags)
  metadata: {
    service: string;
    serviceCode?: string;
    quantity: number;
    unit: "visit" | "night" | "hour" | "day";
    duration?: number; // In minutes
    petCount: number;
    startAt: string; // ISO 8601
    endAt: string; // ISO 8601
    holidayApplied: boolean;
    afterHoursApplied: boolean;
    pricingVersion: string; // e.g., "v1.0.0"
    calculatedAt: string; // ISO 8601
    calculatedBy?: string; // System identifier
    pricingPolicyFlags?: {
      rushOrder?: boolean;
      travelRequired?: boolean;
      specialHandling?: boolean;
      [key: string]: boolean | undefined;
    };
  };
  
  // Computed totals for convenience (derived from above)
  subtotal: number; // subtotalBaseServices + addOnsTotal
  subtotalAfterDiscounts: number; // subtotal - discountsTotal
  finalTotal: number; // subtotalAfterDiscounts + feesTotal + taxesTotal (same as total)
}
```

## Mapping from Current PriceBreakdown

**Current Structure** (`booking-utils.ts`):
```typescript
interface PriceBreakdown {
  basePrice: number;           → subtotalBaseServices
  additionalPets: number;      → addOns[type: "additional_pet"]
  holidayAdd: number;          → addOns[type: "holiday"]
  afterHoursAdd: number;       → addOns[type: "after_hours"]
  quantity: number;            → metadata.quantity
  total: number;               → total
  breakdown: Array<...>;       → Flattened into addOns/fees/discounts
}
```

## Storage in Database

**Per Master Spec Line 5.2.1**: "The booking stores pricingSnapshot which is the canonical output."

**Prisma Schema Addition**:
```prisma
model Booking {
  // ... existing fields ...
  pricingSnapshot String? @db.Text // JSON string of CanonicalPricingBreakdown
  // ... rest of fields ...
}
```

## Usage Rules (Per Master Spec Lines 5.2.2-5.2.4)

1. **Display Rules (5.2.2)**: Surfaces display `pricingSnapshot` by default when available
2. **Recompute Rules (5.2.3)**: Recompute allowed only on `draft` or `requested` statuses, or via explicit owner override
3. **Override Audit (5.2.4)**: Any override writes an audit entry and stores both before and after

## Next Steps

1. ✅ Schema defined
2. ⏳ Implement PricingEngine v1 that outputs this schema
3. ⏳ Add `pricingSnapshot` field to Prisma schema
4. ⏳ Create PricingParity harness
5. ⏳ Integrate behind feature flag

