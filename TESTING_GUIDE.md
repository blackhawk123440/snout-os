# Testing Guide - Sitters API

## Quick Test (2 minutes)

### Local Testing

1. **Start the dev server:**
   ```bash
   cd snout-os
   npm run dev
   ```

2. **Login as owner:**
   - Navigate to: `http://localhost:3000/login`
   - Login with your owner account

3. **Test Sitters Tab:**
   - Navigate to: `http://localhost:3000/messages?tab=sitters`
   - Open DevTools → Network tab
   - **Expected:**
     - Request: `GET /api/sitters`
     - Status: `200 OK`
     - Response: `{ sitters: [...] }`
     - Headers: `X-Snout-Api: sitters-route-hit`, `X-Snout-OrgId: <your-org-id>`

4. **Test Numbers Assign Dropdown:**
   - Navigate to: `http://localhost:3000/messages?tab=numbers`
   - Click "Assign/Reassign Sitter" on any number (3-dot menu)
   - **Expected:**
     - Dropdown populated with sitters
     - Same network request as above

### Staging Testing

1. **Navigate to staging:**
   - URL: `https://snout-os-staging.onrender.com`
   - Login as owner

2. **Verify build badge:**
   - Check build badge (top-right or footer)
   - **Expected:** SHA should be `6fbfa96` or later

3. **Test Sitters Tab:**
   - Navigate to: `https://snout-os-staging.onrender.com/messages?tab=sitters`
   - Open DevTools → Network tab
   - Filter by: `sitters`
   - **Expected:**
     - Request: `GET /api/sitters`
     - Status: `200 OK` (or `401` if auth issue)
     - Response Headers:
       - `X-Snout-Api: sitters-route-hit` ✅
       - `X-Snout-OrgId: <your-org-id>` or `missing` ✅
       - `X-Snout-Route: proxy` or `prisma-fallback` ✅
     - Response Body: `{ sitters: [...] }`

4. **Test Numbers Assign Dropdown:**
   - Navigate to: `https://snout-os-staging.onrender.com/messages?tab=numbers`
   - Click "Assign/Reassign Sitter" (3-dot menu)
   - **Expected:**
     - Dropdown shows sitters
     - Network shows same request with debug headers

## Troubleshooting

### If you see 404:
1. Check Network tab → Request URL
   - Should be: `https://snout-os-staging.onrender.com/api/sitters`
   - If different: Check for rewrite/redirect in `next.config.js`
2. Check Render deployment logs:
   - Render Dashboard → Service → Deploys → Latest → Build Log
   - Look for build errors

### If you see 401 with `X-Snout-Auth: missing-orgid`:
1. **Problem:** `orgId` not found in session
2. **Check:** NextAuth session setup
3. **Response:** `{ error: 'Organization ID missing. Please contact support.', details: 'orgId is required but was not found in session.' }`
4. **Fix:** Ensure `session.user.orgId` is set in NextAuth callbacks

### If you see empty array `{ sitters: [] }`:
1. **This is correct** if no sitters exist in your org
2. **To test with data:**
   - Navigate to: `/bookings/sitters`
   - Create a sitter
   - Return to `/messages?tab=sitters`
   - Should see the sitter listed

### If you see "No sitters found" but sitters exist:
1. Check Network tab → Response
   - If `200 OK` with `{ sitters: [] }` → Org scoping is working (sitters in different org)
   - If `200 OK` with `{ sitters: [...] }` → UI bug (check React Query cache)
2. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

## Verification Checklist

- [ ] Build badge shows `6fbfa96` or later
- [ ] `/messages?tab=sitters` shows sitters (or empty state if none)
- [ ] Network tab shows `200 OK` for `/api/sitters`
- [ ] Response headers include `X-Snout-Api: sitters-route-hit`
- [ ] Response headers include `X-Snout-OrgId: <org-id>`
- [ ] Response body is `{ sitters: [...] }` format
- [ ] Numbers "Assign to Sitter" dropdown populated
- [ ] No 404 errors in Network tab

## Expected Network Request

```
Request URL: https://snout-os-staging.onrender.com/api/sitters
Request Method: GET
Status Code: 200 OK

Response Headers:
  Content-Type: application/json
  X-Snout-Api: sitters-route-hit
  X-Snout-Route: prisma-fallback
  X-Snout-OrgId: org-abc123

Response Body:
{
  "sitters": [
    {
      "id": "sitter-xyz789",
      "name": "Jane Doe",
      "firstName": "Jane",
      "lastName": "Doe",
      "isActive": true,
      "assignedNumberId": "number-123" | null,
      "phone": null,
      "email": null,
      "commissionPercentage": 80.0,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "currentTier": null
    }
  ]
}
```

## Quick Command Reference

```bash
# Start local dev server
npm run dev

# Check TypeScript errors
npm run typecheck

# View recent commits
git log --oneline -5

# Check current branch
git branch

# View staging URL (if configured)
echo $NEXT_PUBLIC_API_URL
```
