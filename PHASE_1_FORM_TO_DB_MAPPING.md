# Phase 1: Form to Dashboard Wiring Map

## Purpose
This document inventories every booking form field, maps it to the database schema, and documents any mismatches or transformation logic. This is the foundation for building a typed, validated mapping layer.

## Form Payload Structure (from booking-form.html lines 4087-4114)

```typescript
{
  firstName: string,
  lastName: string,
  phone: string,
  email?: string,
  address?: string,
  pickupAddress?: string,
  dropoffAddress?: string,
  service: string, // "Dog Walking" | "Housesitting" | "24/7 Care" | "Drop-ins" | "Pet Taxi"
  minutes: number, // Duration in minutes (30 or 60)
  quantity: number, // Number of visits/nights
  startAt: string, // ISO date string
  endAt: string, // ISO date string
  pets: Array<{ name: string, species: string }>,
  selectedDates: string[], // Array of date strings "YYYY-MM-DD"
  dateTimes: object, // Map of date -> array of { time: string, duration: number }
  notes?: string,
  afterHours: boolean,
  holiday: boolean,
  createdFrom: string // "Webflow"
}
```

## Database Schema (Booking model from schema.prisma)

```prisma
model Booking {
  id                   String
  firstName            String
  lastName             String
  phone                String
  email                String?
  address              String?
  pickupAddress        String?
  dropoffAddress       String?
  service              String
  startAt              DateTime
  endAt                DateTime
  totalPrice           Float
  status               String                 @default("pending")
  assignmentType       String?
  notes                String?
  stripePaymentLinkUrl String?
  tipLinkUrl           String?
  paymentStatus        String                 @default("unpaid")
  createdAt            DateTime               @default(now())
  updatedAt            DateTime               @updatedAt
  afterHours           Boolean                @default(false)
  holiday              Boolean                @default(false)
  quantity             Int                    @default(1)
  pets                 Pet[]
  sitter               Sitter?
  sitterId             String?
  timeSlots            TimeSlot[]
  // ... relations
}
```

## Field-by-Field Mapping

### Direct 1:1 Mappings (No Transformation)

| Form Field | DB Field | Type | Required | Notes |
|------------|----------|------|----------|-------|
| `firstName` | `firstName` | String | ✅ Yes | Trimmed in API |
| `lastName` | `lastName` | String | ✅ Yes | Trimmed in API |
| `phone` | `phone` | String | ✅ Yes | Formatted via `formatPhoneForAPI()` |
| `email` | `email` | String? | ❌ No | Trimmed, validated with regex |
| `address` | `address` | String? | Conditional | Required for non-pet-taxi, non-house-sitting |
| `pickupAddress` | `pickupAddress` | String? | Conditional | Required for Pet Taxi only |
| `dropoffAddress` | `dropoffAddress` | String? | Conditional | Required for Pet Taxi only |
| `service` | `service` | String | ✅ Yes | Validated against enum in API |
| `startAt` | `startAt` | DateTime | ✅ Yes | Converted from ISO string to Date |
| `endAt` | `endAt` | DateTime | ✅ Yes | Converted from ISO string to Date |
| `afterHours` | `afterHours` | Boolean | ❌ No | Always `false` from form, defaults to `false` |
| `holiday` | `holiday` | Boolean | ❌ No | Always `false` from form, calculated in API |
| `quantity` | `quantity` | Int | ❌ No | Calculated in API based on service type |
| `notes` | `notes` | String? | ❌ No | Handled via multiple field fallback (notes, specialInstructions, additionalNotes) |

### Complex Mappings (Require Transformation)

#### 1. Service Name Mapping
- **Form Value**: `"pet-sitting"`, `"dog-walking"`, `"drop-in"`, `"pet-taxi"` (lowercase with dashes)
- **DB Value**: `"Dog Walking"`, `"Housesitting"`, `"24/7 Care"`, `"Drop-ins"`, `"Pet Taxi"` (title case)
- **Transformation**: Done in form's `submitForm()` method (lines 3996-4009)
- **API Validation**: Validates against enum: `["Dog Walking", "Housesitting", "24/7 Care", "Drop-ins", "Pet Taxi"]`
- **Risk**: If form sends wrong service name, API rejects with 400 error

#### 2. Pets Array
- **Form Structure**: `Array<{ name: string, species: string }>`
- **DB Structure**: `Pet[]` relation with `create` nested operation
- **Transformation**: 
  - Form sends: `[{ name: "Dog 1", species: "Dog" }, ...]`
  - API creates: `pets: { create: [{ name: "Dog 1", species: "Dog" }, ...] }`
- **Fallback**: If no pets provided, defaults to `[{ name: "Pet 1", species: "Dog" }]`
- **Risk**: Pet names/species may not match client's actual pet names

#### 3. TimeSlots Array
- **Form Structure**: `{ selectedDates: string[], dateTimes: object }`
- **DB Structure**: `TimeSlot[]` relation with `create` nested operation
- **Transformation**:
  - Form sends: `selectedDates: ["2024-01-15"], dateTimes: { "2024-01-15": [{ time: "09:00 AM", duration: 30 }] }`
  - API converts to: `TimeSlot[]` with `startAt`, `endAt`, `duration` (in minutes)
  - Complex timezone/date handling (lines 201-265 in API)
- **Risk**: Timezone issues may cause incorrect slot times stored
- **Special Case**: For house sitting, quantity is calculated as `selectedDates.length - 1` (nights)

#### 4. Notes Field (Multiple Sources)
- **Form Fields**: `notes`, `specialInstructions`, `additionalNotes` (from form HTML)
- **API Handling**: Checks all three fields, uses first non-null value (lines 353-377)
- **DB Field**: `notes` (single String? field)
- **Risk**: Multiple field names create confusion; only one value can be stored
- **Current Issue**: User reports notes not showing in dashboard - indicates mapping/display issue

#### 5. Quantity Calculation
- **Form Sends**: `quantity` field directly
- **API Overrides**: Recalculates based on service type:
  - House Sitting: `selectedDates.length - 1` (number of nights)
  - Other Services: `timeSlots.length` (number of visits)
- **Risk**: Form and API may disagree on quantity, causing inconsistencies

#### 6. Total Price
- **Form Does NOT Send**: `totalPrice` is not in form payload
- **API Calculates**: Uses `calculateBookingPrice()` then `calculatePriceBreakdown()`
- **DB Field**: `totalPrice` (Float, required)
- **Risk**: Price calculation happens server-side, form may show different total than stored

#### 7. Status & Payment Status
- **Form Does NOT Send**: Neither field is in form payload
- **API Sets**: `status: "pending"`, `paymentStatus: "unpaid"`
- **DB Defaults**: Match API defaults
- **Risk**: None (correct defaults)

#### 8. Dates (startAt/endAt) for House Sitting
- **Form Logic**: For house sitting, uses first selected date as startAt, last selected date as endAt
- **API Logic**: Similar logic (lines 274-310), may recalculate based on dateTimes
- **Risk**: Timezone conversion issues (lines 214-225 show complex timezone handling)

### Fields NOT in Form but in DB

| DB Field | Source | Default/Value | Notes |
|----------|--------|---------------|-------|
| `id` | Generated | UUID | Auto-generated |
| `status` | API | `"pending"` | Hardcoded |
| `paymentStatus` | API | `"unpaid"` | Hardcoded |
| `totalPrice` | API | Calculated | From `calculatePriceBreakdown()` |
| `createdAt` | Database | `now()` | Auto-generated |
| `updatedAt` | Database | `now()` | Auto-timestamp |
| `stripePaymentLinkUrl` | Later | `null` | Set when payment link created |
| `tipLinkUrl` | Later | `null` | Set when tip link created |
| `sitterId` | Later | `null` | Set when sitter assigned |
| `assignmentType` | Later | `null` | Set when assignment happens |
| `clientId` | Later | `null` | Set if client record exists/linked |

### Fields in Form but NOT in DB

| Form Field | Where It Goes | Notes |
|------------|---------------|-------|
| `minutes` | Used for duration calc | Not stored directly, used to calculate `TimeSlot.duration` |
| `selectedDates` | Used to build TimeSlots | Not stored directly, converted to TimeSlot[] |
| `dateTimes` | Used to build TimeSlots | Not stored directly, converted to TimeSlot[] |
| `createdFrom` | Not stored | Metadata for debugging, not persisted |

## Known Issues and Risks

### 🔴 High Risk
1. **Notes Field Confusion**: Multiple field names (`notes`, `specialInstructions`, `additionalNotes`) with unclear precedence
2. **Timezone Handling**: Complex timezone conversion logic (lines 214-225) may cause incorrect times stored
3. **Quantity Calculation**: Form and API may disagree, causing booking quantity mismatches
4. **Price Calculation**: Form may show different total than what's stored (form doesn't calculate, only displays estimate)

### 🟡 Medium Risk
1. **Service Name Mapping**: Form uses lowercase-dashed names, DB expects title case - if mapping fails, booking rejected
2. **Pet Names**: Form generates generic names like "Dog 1", may not match actual pet names
3. **Date Parsing**: ISO string conversion may have edge cases with timezone offsets

### 🟢 Low Risk
1. **Phone Formatting**: `formatPhoneForAPI()` should handle most formats, but edge cases may exist
2. **Email Validation**: Basic regex validation, may reject valid international formats

## Validation Rules (from API)

1. **Required Fields**: `firstName`, `lastName`, `phone`, `service`, `startAt`, `endAt`
2. **Phone Format**: Regex `/^[\d\s\-\(\)+]+$/` (allows digits, spaces, dashes, parens, plus)
3. **Email Format**: Basic regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
4. **Date Validation**: Must parse to valid Date, `endAt` must be after `startAt`
5. **Service Validation**: Must be in enum `["Dog Walking", "Housesitting", "24/7 Care", "Drop-ins", "Pet Taxi"]`
6. **Address Requirements**: 
   - Pet Taxi: `pickupAddress` and `dropoffAddress` required
   - Other services (except House Sitting): `address` required

## Next Steps for Phase 1

1. ✅ **Inventory Complete** (this document)
2. ⏳ **Create Typed Mapping Layer** - Type-safe function that maps form payload to DB input
3. ⏳ **Add Validation Schema** - Zod schema for form payload validation
4. ⏳ **Add Tests** - Test known payloads produce expected DB records
5. ⏳ **Add Logging** - Log mapping version and transformations applied

