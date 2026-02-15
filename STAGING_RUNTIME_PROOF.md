# Staging Runtime Proof - Sitters API

## 1. Deployed Commit Verification

### Check Build Badge
1. Navigate to: `https://snout-os-staging.onrender.com`
2. Look for build badge in UI (typically top-right or footer)
3. **Expected:** SHA should be `f31bcc4` or later
4. **If not:** Check Render deployment logs for:
   - Build command: `npm run build`
   - Git branch: Should be `main`
   - Latest commit: Should include `f31bcc4` or later

### Verify Commit in Deployment
```bash
# In Render dashboard, check:
# Deploy → Build Log → Look for commit SHA
# Or via Render API:
curl https://api.render.com/v1/services/<service-id>/deploys
```

**Required commits:**
- `f31bcc4` - Fix sitters API: add org scoping, assignedNumberId, and fix response format mismatch
- `5b2e032` - Fix empty state message: change Settings to Bookings
- `[latest]` - Add staging debug headers and fail loudly on missing orgId

## 2. Exact Request Paths

### A) Sitters Tab Request
**UI Component:**
- File: `src/components/messaging/SittersPanel.tsx`
- Line: 13 (import), 44 (usage)
- Code: `const { data: sitters = [], isLoading } = useSitters();`

**Hook Implementation:**
- File: `src/lib/api/numbers-hooks.ts`
- Line: 180-198
- Code:
  ```typescript
  export function useSitters() {
    return useQuery({
      queryKey: ['sitters'],
      queryFn: async () => {
        const response = await apiGet('/api/sitters', z.object({
          sitters: z.array(z.object({...})),
        }));
        return response.sitters;
      },
    });
  }
  ```

**API Client:**
- File: `src/lib/api/client.ts`
- Line: 214-220
- Code: `apiGet('/api/sitters', ...)` → `apiRequest('/api/sitters', { method: 'GET' }, ...)`
- Line: 98: `const url = API_BASE_URL ? ${API_BASE_URL}${endpoint} : endpoint;`
- **Result:** `url = '/api/sitters'` (relative, same origin)

**Exact URL Requested:** `GET /api/sitters` (relative URL, resolves to `https://snout-os-staging.onrender.com/api/sitters`)

### B) Numbers "Assign to Sitter" Dropdown Request
**UI Component:**
- File: `src/components/messaging/NumbersPanelContent.tsx`
- Line: 28 (import), 155 (usage)
- Code: `const { data: sitters = [] } = useSitters();`

**Hook Implementation:**
- Same as above: `src/lib/api/numbers-hooks.ts:180`

**Exact URL Requested:** `GET /api/sitters` (same endpoint)

## 3. Route Existence Proof

### Next.js Route File
- **Path:** `src/app/api/sitters/route.ts`
- **Export:** `export async function GET(request: NextRequest)`
- **Next.js Route:** `/api/sitters` (GET method)

### Route Verification
1. **File exists:** `src/app/api/sitters/route.ts` ✅
2. **No rewrite/redirect:** Check `next.config.js` or `next.config.mjs` for rewrites
3. **No middleware redirect:** Check `src/middleware.ts` (if exists) for redirects

### Expected Behavior
- Request: `GET /api/sitters`
- Handler: `src/app/api/sitters/route.ts:15` → `export async function GET(...)`
- No rewrite should intercept this route

## 4. Auth + OrgId Proof

### OrgId Derivation
- **File:** `src/app/api/sitters/route.ts`
- **Line 17:** `const session = await auth();`
- **Line 19-24:** Auth check - returns 401 if no session
- **Line 26-30:** Extract orgId:
  ```typescript
  const user = session.user as any;
  const orgId = user.orgId || 'default';
  ```

### Missing OrgId Handling
- **File:** `src/app/api/sitters/route.ts`
- **Line 32-45:** Production check:
  ```typescript
  if (process.env.NODE_ENV === 'production' && (!user.orgId || user.orgId === 'default')) {
    return NextResponse.json(
      { error: 'Organization ID missing. Please contact support.', ... },
      { status: 401, headers: { 'X-Snout-Auth': 'missing-orgid', 'X-Snout-OrgId': 'missing' } }
    );
  }
  ```

**Result:** If orgId is missing in staging, returns 401 with clear error message (not empty array).

## 5. Debug Headers Added

### Response Headers (All Responses)
- `X-Snout-Api: sitters-route-hit` - Confirms route executed
- `X-Snout-OrgId: <orgId>` or `'missing'` - Shows orgId value
- `X-Snout-Route: proxy` or `prisma-fallback` or `error` - Shows execution path

### Header Locations
- **401 (Unauthorized):** Line 22-28
- **401 (Missing OrgId):** Line 36-45
- **200 (Proxy):** Line 125-130
- **200 (Prisma Fallback):** Line 199-204
- **500 (Error):** Line 207-214

## Staging Verification Steps

### Step 1: Verify Build Badge
1. Open: `https://snout-os-staging.onrender.com`
2. Find build badge (top-right or footer)
3. **Expected:** SHA includes `f31bcc4` or later
4. **Screenshot:** Capture build badge showing SHA

### Step 2: Sitters Tab Request
1. Navigate to: `https://snout-os-staging.onrender.com/messages?tab=sitters`
2. Open DevTools → Network tab
3. Filter by: `sitters`
4. **Expected:**
   - Request: `GET /api/sitters`
   - Status: `200 OK` (or `401` if auth/orgId issue)
   - Response Headers:
     - `X-Snout-Api: sitters-route-hit` ✅
     - `X-Snout-OrgId: <your-org-id>` or `missing` ✅
     - `X-Snout-Route: proxy` or `prisma-fallback` ✅
   - Response Body: `{ sitters: [...] }`
5. **Screenshot:** Capture:
   - Network tab showing request
   - Headers tab showing `X-Snout-*` headers
   - Response preview showing `{ sitters: [...] }`

### Step 3: Numbers Assign Dropdown Request
1. Navigate to: `https://snout-os-staging.onrender.com/messages?tab=numbers`
2. Click "Assign/Reassign Sitter" (3-dot menu on any number)
3. Open DevTools → Network tab
4. **Expected:**
   - Request: `GET /api/sitters` (may be cached)
   - Status: `200 OK` (or `401` if auth/orgId issue)
   - Response Headers: Same as Step 2
   - Dropdown populated with sitters
5. **Screenshot:** Capture:
   - Modal with dropdown populated
   - Network tab showing request
   - Headers showing `X-Snout-*` headers

### Step 4: Auth/OrgId Failure Case
1. If you see `401` with `X-Snout-Auth: missing-orgid`:
   - **Expected:** Response body: `{ error: 'Organization ID missing. Please contact support.', details: 'orgId is required but was not found in session.' }`
   - **Action:** Check session setup in NextAuth config
2. **Screenshot:** Capture 401 response with error message

### Step 5: Route Not Found (404) Case
1. If you see `404`:
   - **Check:** DevTools → Network → Request URL
   - **Expected URL:** `https://snout-os-staging.onrender.com/api/sitters`
   - **If different:** Check for rewrite/redirect in `next.config.js`
   - **If same:** Check Render deployment logs for build errors
2. **Screenshot:** Capture 404 response

## Expected Response Examples

### Success (200 OK)
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Snout-Api: sitters-route-hit
X-Snout-Route: prisma-fallback
X-Snout-OrgId: org-abc123

{
  "sitters": [
    {
      "id": "sitter-xyz789",
      "name": "Jane Doe",
      "isActive": true,
      "assignedNumberId": "number-123",
      ...
    }
  ]
}
```

### Auth Failure (401)
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
X-Snout-Api: sitters-route-hit
X-Snout-Auth: missing-session

{
  "error": "Unauthorized"
}
```

### Missing OrgId (401)
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
X-Snout-Api: sitters-route-hit
X-Snout-Auth: missing-orgid
X-Snout-OrgId: missing

{
  "error": "Organization ID missing. Please contact support.",
  "details": "orgId is required but was not found in session."
}
```

## Files Changed (Latest Commit)

1. `src/app/api/sitters/route.ts:15-45` - Added auth/orgId validation and debug headers
2. `src/app/api/sitters/route.ts:125-130` - Added debug headers to proxy response
3. `src/app/api/sitters/route.ts:199-204` - Added debug headers to Prisma fallback response
4. `src/app/api/sitters/route.ts:207-214` - Added debug headers to error response

## Commit SHA
`[run: git log --oneline -1]` - Add staging debug headers and fail loudly on missing orgId
