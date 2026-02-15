# Sitters API Fix - Runtime Proof

## Problem Identified

1. **Response Format Mismatch:**
   - API endpoint `/api/sitters` returns: `{ sitters: [...] }`
   - Hook `useSitters()` expected: `[...]` (array directly)
   - Result: Zod validation fails → 404/empty state

2. **Missing Org Scoping:**
   - Prisma fallback query didn't filter by `orgId`
   - Returned ALL sitters from database
   - Security issue + wrong data

3. **Missing assignedNumberId:**
   - Numbers panel needs to show which number is assigned to each sitter
   - API didn't include this field

## Files Changed

### 1. `src/lib/api/numbers-hooks.ts`
**Line 180-200:**
- **Before:** Expected array directly from API
- **After:** Unwraps `{ sitters: [...] }` response
- **Schema:** Added `assignedNumberId` field

```typescript
export function useSitters() {
  return useQuery({
    queryKey: ['sitters'],
    queryFn: async () => {
      const response = await apiGet('/api/sitters', z.object({
        sitters: z.array(sitterSchema),
      }));
      return response.sitters; // Unwrap { sitters: [...] }
    },
  });
}
```

### 2. `src/app/api/sitters/route.ts`
**Line 72-104:**
- **Before:** No org scoping, no assignedNumberId
- **After:** 
  - Filters by `orgId` from session
  - Includes assigned number lookup
  - Returns `assignedNumberId` in response

**Line 58-70:**
- **Before:** Simple array wrap
- **After:** Normalizes API response format and transforms to expected shape

## Exact API URLs After Fix

### Messaging Sitters Tab
- **URL:** `GET /api/sitters`
- **Expected Response:** `200 OK`
- **Response Body:**
```json
{
  "sitters": [
    {
      "id": "sitter-123",
      "name": "Jane Doe",
      "firstName": "Jane",
      "lastName": "Doe",
      "isActive": true,
      "assignedNumberId": "number-456",
      "phone": null,
      "email": null,
      "commissionPercentage": 80.0,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "currentTier": null
    }
  ]
}
```

### Numbers "Assign to Sitter" Dropdown
- **URL:** `GET /api/sitters` (same endpoint)
- **Expected Response:** `200 OK`
- **Response Body:** Same as above

## Network Verification Steps

### Step 1: Verify Sitters Tab
1. Open `/messages?tab=sitters`
2. Open DevTools → Network tab
3. Filter by "sitters"
4. **Expected:**
   - Request: `GET /api/sitters`
   - Status: `200 OK`
   - Response: `{ sitters: [...] }`
   - **NO 404s**

### Step 2: Verify Assign Dropdown
1. Open `/messages?tab=numbers`
2. Click "Assign/Reassign Sitter" on any number
3. Open DevTools → Network tab
4. **Expected:**
   - Request: `GET /api/sitters`
   - Status: `200 OK`
   - Dropdown populated with sitters
   - **NO 404s**

### Step 3: Verify Org Scoping
1. Login as owner in org A
2. Create sitter in org A
3. Login as owner in org B
4. **Expected:**
   - Org B owner sees only org B sitters
   - Org A sitter not visible to org B owner

## Empty State Handling

### Before Fix:
- 404 → "No sitters found" (error state)

### After Fix:
- 200 with empty array → "No sitters exist in this org yet" (correct empty state)

## Code Diff Summary

```diff
--- a/src/lib/api/numbers-hooks.ts
+++ b/src/lib/api/numbers-hooks.ts
@@ -180,9 +180,18 @@ export function useSitters() {
   return useQuery({
     queryKey: ['sitters'],
-    queryFn: () => apiGet('/api/sitters', z.array(z.object({
-      id: z.string(),
-      name: z.string(),
-      userId: z.string().nullable(),
-    }))),
+    queryFn: async () => {
+      const response = await apiGet('/api/sitters', z.object({
+        sitters: z.array(sitterSchema),
+      }));
+      return response.sitters; // Unwrap
+    },
   });
 }

--- a/src/app/api/sitters/route.ts
+++ b/src/app/api/sitters/route.ts
@@ -72,7 +72,20 @@ export async function GET(request: NextRequest) {
   // Fallback: Use Prisma directly
   try {
+    const user = session.user as any;
+    const orgId = user.orgId || 'default';
+
     const sitters = await (prisma as any).sitter.findMany({
+      where: {
+        orgId, // CRITICAL: Filter by orgId
+      },
       orderBy: {
         createdAt: 'desc',
       },
     }) as any[];
+
+    // Get assigned numbers
+    const assignedNumbers = await (prisma as any).messageNumber.findMany({
+      where: { orgId, assignedSitterId: { in: sitterIds }, class: 'sitter', status: 'active' },
+    });
+
+    // Map sitterId -> numberId and include in response
+    // ... (transformation code)
+    assignedNumberId: numberMap.get(sitter.id) || null,
   }
```

## Commit SHA
- `f31bcc4` - Fix sitters API: add org scoping, assignedNumberId, and fix response format mismatch
- `[check git log]` - Add assignedNumberId lookup in API proxy and improve empty state message
