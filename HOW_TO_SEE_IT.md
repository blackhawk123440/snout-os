# How to See the Messaging UI

## Quick Start

### Local Development

1. **Set environment variables** in `.env.local`:
   ```bash
   NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

2. **Start the development server**:
   ```bash
   pnpm dev
   ```

3. **Visit** `http://localhost:3000/messages`

4. **If no threads appear**:
   - Click the "Create Demo Data" button (bottom-right diagnostics panel)
   - OR run manually: `npx tsx scripts/seed-messaging-data.ts`
   - Refresh the page

5. **To see diagnostics**:
   - Click "Show" in the "Ops / Diagnostics" panel (bottom-right, owner-only)
   - This shows exact failure reasons if threads aren't loading

### Staging (Render)

1. **Set environment variables** in Render dashboard:
   ```bash
   NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
   NEXT_PUBLIC_API_URL=https://your-staging-api-url.onrender.com
   NEXT_PUBLIC_GIT_SHA=$(git rev-parse --short HEAD)
   NEXT_PUBLIC_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
   NEXT_PUBLIC_SHOW_BUILD_HASH=true
   ALLOW_DEV_SEED=true  # Optional: only if you want seed endpoint in staging
   ```

2. **Redeploy** the web service

3. **Verify build**:
   - Check bottom-right corner for build hash (owner-only)
   - Should show commit SHA and build time

4. **Visit** `/messages` on staging URL

5. **If issues**:
   - Check diagnostics panel (bottom-right, owner-only)
   - Verify env vars are set correctly
   - Check API logs for errors

## Troubleshooting Matrix

### Symptom: "Messaging is disabled" message

**Cause**: `NEXT_PUBLIC_ENABLE_MESSAGING_V1` is not set to `'true'`

**Fix**:
- Local: Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` in `.env.local` and restart dev server
- Staging: Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` in Render env vars and redeploy

**Verify**: Check diagnostics panel - should show flag value

---

### Symptom: Skeleton/loading state never resolves

**Cause**: API request failing or hanging

**Fix**:
1. Check diagnostics panel for error details
2. Verify `NEXT_PUBLIC_API_URL` is correct
3. Check API server is running (local) or deployed (staging)
4. Check browser console for network errors

**Verify**: Diagnostics panel shows last fetch URL and status code

---

### Symptom: "401 Unauthorized" error

**Cause**: JWT token missing or invalid

**Fix**:
1. Log out and log back in
2. Check browser localStorage for `auth_token`
3. Verify API server is accepting the token format

**Verify**: Diagnostics panel shows "Auth mismatch" error

---

### Symptom: "404 Not Found" error

**Cause**: Wrong API base URL or route doesn't exist

**Fix**:
1. Verify `NEXT_PUBLIC_API_URL` points to correct API server
2. Check that `/api/messages/threads` route exists on API server
3. Verify API server is running and accessible

**Verify**: Diagnostics panel shows "Wrong API base URL" error

---

### Symptom: Empty state "No threads yet"

**Cause**: Database is empty

**Fix**:
1. Click "Create Demo Data" button in diagnostics panel (dev only)
2. OR run: `npx tsx scripts/seed-messaging-data.ts`
3. Refresh page

**Verify**: Threads appear after seeding

---

### Symptom: Sitter deep-link doesn't filter

**Cause**: Sitter filter not applied or no threads for sitter

**Fix**:
1. Verify URL contains `?sitterId={id}`
2. Check diagnostics panel shows sitter filter applied
3. If no threads: Create assignment window and thread for that sitter

**Verify**: 
- URL shows `?sitterId={id}`
- Thread list is filtered to that sitter
- If empty, shows "No active conversations for this sitter"

---

### Symptom: Staging shows old pages/missing changes

**Cause**: Wrong build deployed or env vars not set

**Fix**:
1. Check build hash in bottom-right corner (owner-only)
2. Verify commit SHA matches expected commit
3. Verify all env vars are set in Render
4. Redeploy with correct env vars

**Verify**: Build hash shows correct commit SHA

---

### Symptom: Diagnostics panel not visible

**Cause**: Not owner role or diagnostics disabled

**Fix**:
1. Verify you're logged in as owner
2. Set `NEXT_PUBLIC_SHOW_DIAGNOSTICS=true` (optional, defaults to dev mode)
3. Check diagnostics panel is not hidden (click "Show" if collapsed)

**Verify**: Panel appears in bottom-right corner

---

## Step-by-Step Verification

### Local Verification

1. **Start services**:
   ```bash
   # Terminal 1: API server
   cd apps/api && pnpm dev
   
   # Terminal 2: Web server
   cd apps/web && pnpm dev
   ```

2. **Set env vars** in `apps/web/.env.local`:
   ```
   NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. **Visit** `http://localhost:3000/messages`

4. **Check diagnostics**:
   - Should show "Ops / Diagnostics" panel (bottom-right)
   - Click "Show" to expand
   - Verify flag is ON, API URL is correct, user is logged in

5. **Seed data**:
   - Click "Create Demo Data" button
   - Should see success message
   - Page should refresh and show threads

6. **Test sitter deep-link**:
   - Visit `/sitters/{any-sitter-id}`
   - Click "Open Inbox" button
   - Should navigate to `/messages?sitterId={id}`
   - Should show filtered threads (or empty state if no threads)

### Staging Verification

1. **Set env vars** in Render:
   ```
   NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
   NEXT_PUBLIC_API_URL=https://your-api-url.onrender.com
   NEXT_PUBLIC_GIT_SHA={commit-sha}
   NEXT_PUBLIC_BUILD_TIME={timestamp}
   NEXT_PUBLIC_SHOW_BUILD_HASH=true
   ```

2. **Redeploy** web service

3. **Verify build**:
   - Check bottom-right corner for build hash
   - Should show commit SHA (first 7 chars) and build time
   - Verify it matches expected commit

4. **Visit** `/messages` on staging URL

5. **Check diagnostics**:
   - Should show diagnostics panel (owner-only)
   - Verify all values are correct
   - If errors, follow troubleshooting matrix above

6. **Test features**:
   - Thread list should load
   - Selecting thread should show messages
   - Sitter deep-link should work

## Common Issues

### Issue: "Cannot read property 'role' of null"

**Fix**: User not loaded yet. Wait for auth to complete or check auth flow.

### Issue: "Module not found" errors

**Fix**: Run `pnpm install` to ensure all dependencies are installed.

### Issue: API returns 500 errors

**Fix**: Check API server logs. Common causes:
- Database connection issues
- Missing env vars on API server
- Schema migrations not applied

### Issue: Threads appear but messages don't load

**Fix**: 
- Check API endpoint `/api/messages/threads/{id}` exists
- Verify thread ID is valid
- Check browser console for errors

## Getting Help

If issues persist:

1. **Check diagnostics panel** - Shows exact failure reasons
2. **Check browser console** - Look for JavaScript errors
3. **Check API logs** - Look for server-side errors
4. **Verify env vars** - All required vars must be set
5. **Check build hash** - Verify correct code is deployed

## Environment Variables Reference

### Required (Local)
- `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` - Enable messaging UI
- `NEXT_PUBLIC_API_URL=http://localhost:3001` - API server URL

### Required (Staging)
- `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` - Enable messaging UI
- `NEXT_PUBLIC_API_URL=https://your-api-url.onrender.com` - API server URL
- `NEXT_PUBLIC_GIT_SHA={sha}` - Git commit SHA (for build verification)
- `NEXT_PUBLIC_BUILD_TIME={timestamp}` - Build timestamp (for build verification)
- `NEXT_PUBLIC_SHOW_BUILD_HASH=true` - Show build hash in UI

### Optional
- `ALLOW_DEV_SEED=true` - Allow seed endpoint in staging (not recommended for production)
- `NEXT_PUBLIC_SHOW_DIAGNOSTICS=true` - Show diagnostics panel (defaults to dev mode)
