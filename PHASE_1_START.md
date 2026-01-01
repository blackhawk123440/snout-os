# Phase 1: Form to Dashboard Wiring Map - START

## Status: ✅ Field Inventory Complete

The master document has been updated and the complete field mapping inventory has been created.

## Completed Work

1. ✅ **Master Document Updated**: `SNOUT_OS_INTERNAL_MASTER.md` now contains the upgraded specification
2. ✅ **Field Mapping Inventory**: `PHASE_1_FORM_TO_DB_MAPPING.md` documents:
   - Every form field from booking-form.html
   - Every database field from schema.prisma
   - Direct mappings and complex transformations
   - Known issues and risks (High/Medium/Low priority)
   - Validation rules from API

## Key Findings

### High Risk Issues Identified
1. **Notes Field Confusion**: Multiple field names (`notes`, `specialInstructions`, `additionalNotes`) with unclear precedence - matches user-reported issue
2. **Timezone Handling**: Complex timezone conversion may cause incorrect times
3. **Quantity Calculation**: Form and API may disagree
4. **Price Calculation**: Form doesn't calculate, only displays estimate

### Form Payload Structure
- Form sends 17 fields
- API transforms/normalizes 8 fields
- Database stores 20+ fields (some generated/calculated)

### Critical Transformations
1. Service name: lowercase-dashed → title case
2. Pets array: form array → Prisma nested create
3. TimeSlots: selectedDates/dateTimes → TimeSlot[] with datetime conversion
4. Notes: 3 possible field names → single DB field
5. Quantity: form value → recalculated based on service type

## Next Steps (In Order)

### Step 1: Create Typed Mapping Layer
**File**: `src/lib/form-to-booking-mapper.ts`

Create a type-safe function:
```typescript
export function mapFormPayloadToBookingInput(
  formPayload: FormPayload
): BookingCreateInput
```

**Requirements**:
- TypeScript types for form payload
- Zod schema for validation
- Explicit transformation logic
- Error handling for invalid inputs
- Version tracking for mapping logic

### Step 2: Add Tests
**File**: `__tests__/form-to-booking-mapper.test.ts`

Test cases:
- Valid payload → expected DB input
- Invalid payload → validation errors
- Edge cases (missing optional fields, timezone boundaries, etc.)
- Service name mappings
- Pet array transformations
- TimeSlot conversions

### Step 3: Integrate Mapping Layer
**File**: `src/app/api/form/route.ts`

Replace inline transformation logic with mapper function:
- Keep existing behavior (no breaking changes)
- Add mapping version logging
- Add validation error responses

### Step 4: Add Logging
**File**: `src/lib/form-to-booking-mapper.ts`

Log:
- Mapping version used
- Transformations applied
- Field-by-field mapping results
- Any warnings or fallbacks used

## Files Created

1. `SNOUT_OS_INTERNAL_MASTER.md` - Updated master specification
2. `PHASE_1_FORM_TO_DB_MAPPING.md` - Complete field mapping inventory
3. `PHASE_1_START.md` - This document

## Execution Plan

**Phase 1 Goal**: Create explicit, typed, testable mapping layer without changing runtime behavior.

**Safety Rules**:
- All changes behind feature flag `USE_FORM_MAPPING_LAYER` (default: false)
- Existing API route behavior unchanged until flag enabled
- Tests must pass before enabling flag
- Rollback: flip flag to false

## Ready to Proceed?

The inventory is complete. Next: Create the typed mapping layer with tests.

