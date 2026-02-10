# Deployment Verification - Evidence Only

## Step 1: Render Service Inventory

**Go to: https://dashboard.render.com → Services → Filter by repo: `blackhawk123440/snout-os`**

For each service, provide:
- Service name
- Type (Web Service / Background Worker)
- Root Directory
- Build Command
- Start Command
- Public URL

---

## Step 2: Verify API Health

**Run:**
```bash
curl -i https://<API_PUBLIC_URL>/health
```

**Expected:** `HTTP/1.1 200 OK` with JSON body `{"status":"ok",...}`

**If 404:** API service rootDir/startCmd is wrong or service doesn't exist.

---

## Step 3: Fix NextAuth Environment Variables

**Web Service → Environment → Set:**
```
NEXTAUTH_URL=https://<WEB_PUBLIC_URL>
```
(Must be full https URL, not host-only)

**Verify:**
```bash
curl https://<WEB_PUBLIC_URL>/api/auth/health
```
Should show `NEXTAUTH_URL_RAW: https://<WEB_PUBLIC_URL>`

---

## Step 4: Fix Frontend API Wiring

**Web Service → Environment → Set:**
```
NEXT_PUBLIC_API_URL=https://<API_PUBLIC_URL>
```
(Must be full https URL)

**Verify:**
1. Open browser DevTools → Network tab
2. Navigate to `/messages`
3. Check threads request URL
4. Must be: `https://<API_PUBLIC_URL>/api/messages/threads`
5. Must NOT be: `https://<WEB_PUBLIC_URL>/api/*`

---

## Step 5: Fix Render Web Health Check

**If `/api/health` doesn't exist:**
- Web Service → Settings → Health Check Path
- Change to: `/api/auth/health`
- Save (triggers redeploy)

**Verify:**
```bash
curl https://<WEB_PUBLIC_URL>/api/auth/health
```
Should return 200.

---

## Evidence Required

1. **Service Inventory:** List of all services with exact configs
2. **API Health:** `curl -i` output showing 200
3. **NextAuth Config:** `/api/auth/health` response showing correct `NEXTAUTH_URL`
4. **Network Tab:** Screenshot showing `/messages` requests go to API host
5. **Health Check:** Render dashboard showing service healthy
