# 🚨 DEPLOY NOW - Step-by-Step Checklist

## What to Check RIGHT NOW

### Step 1: Check Render Dashboard Status
1. Go to: https://dashboard.render.com
2. Click your service: `snout-os-staging`
3. **What do you see?**
   - [ ] Service shows "Live" (green) → Skip to Step 4
   - [ ] Service shows "Build failed" (red) → Go to Step 2
   - [ ] Service shows "Deploying" (yellow) → Wait, then check logs
   - [ ] Service doesn't exist → Create it first

### Step 2: Check Build Logs (if build failed)
1. Click **Logs** tab
2. Scroll to the **first error** (red text)
3. **What error do you see?**
   - `P1012: URL must start with postgresql://` → Go to Step 3A
   - `Cannot find module` → Go to Step 3B
   - `Command failed` → Go to Step 3C
   - Other error → Copy the exact error message

### Step 3A: Fix DATABASE_URL Error
1. Click **Environment** tab
2. Look for `DATABASE_URL`
   - [ ] **NOT FOUND** → Click "Add Environment Variable"
     - Key: `DATABASE_URL`
     - Value: `postgresql://postgres.ktmarxugcepkgwgsgifx:9GaX3HSdp6JK7Rh7@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true`
     - Click "Save Changes"
   - [ ] **EXISTS but wrong format** → Edit it, ensure it starts with `postgresql://`
3. Go to **Settings** → **Manual Deploy** → **Deploy latest commit**

### Step 3B: Fix Build Command
1. Click **Settings** tab
2. Find **Build Command**
3. **Current value?**
   - If it has `db push` in it → Change to: `npm install && npm run build`
   - If it's empty → Set to: `npm install && npm run build`
4. Click **Save Changes** (triggers auto-deploy)

### Step 3C: Check Node Version
1. Click **Environment** tab
2. Look for `NODE_VERSION`
   - [ ] **NOT FOUND** → Add it:
     - Key: `NODE_VERSION`
     - Value: `20`
   - [ ] **EXISTS but wrong** → Change to `20`
3. Click **Save Changes**

### Step 4: Verify Environment Variables (All Required)
In **Environment** tab, ensure these exist:

**CRITICAL (Must Have):**
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Your Render URL (e.g., `https://snout-os-staging.onrender.com`)
- [ ] `NEXTAUTH_SECRET` - Random string (generate: `openssl rand -base64 32`)

**IMPORTANT:**
- [ ] `NODE_VERSION=20` (if not set, add it)
- [ ] `OPENPHONE_API_KEY` (if you use OpenPhone)

**OPTIONAL (for messaging - only if enabling):**
- [ ] `ENABLE_MESSAGING_V1=false` (default)
- [ ] `TWILIO_*` variables (only if `ENABLE_MESSAGING_V1=true`)

### Step 5: Verify Build Settings
In **Settings** tab:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Root Directory:**
- If your repo root is `snout-os/` folder → Set to: `snout-os`
- If your repo root is the project → Leave empty

### Step 6: Trigger Deployment
1. Click **Manual Deploy** button (top right)
2. Select **"Deploy latest commit"**
3. Watch the **Logs** tab
4. Wait for build to complete (2-5 minutes)

### Step 7: Check Build Success
In **Logs** tab, look for:
- ✅ `✔ Generated Prisma Client` (should appear)
- ✅ `✓ Compiled successfully` (should appear at end)
- ✅ `Ready on http://localhost:3000` (runtime log)

**If you see errors:**
- Copy the **exact error message**
- Check which step it failed on
- Refer to `RENDER_DEPLOYMENT_TROUBLESHOOTING.md`

### Step 8: Test Deployment
After build succeeds:
1. Click **Logs** tab → Switch to **Runtime** logs
2. Visit: `https://snout-os-staging.onrender.com`
3. **What happens?**
   - [ ] Page loads → ✅ SUCCESS!
   - [ ] Error page → Check runtime logs
   - [ ] Timeout/502 → Service might be starting, wait 30 seconds

## Quick Fix Commands

If you have Render CLI access:
```bash
# Check service status
render services list

# View logs
render logs --service snout-os-staging
```

## Still Not Working?

**Tell me:**
1. What step did you get stuck on?
2. What's the exact error message from logs?
3. What does the service status show? (Live/Failed/Deploying)

## Most Common Issues

1. **DATABASE_URL missing** → Add it in Environment tab
2. **Build command wrong** → Change to `npm install && npm run build`
3. **Node version wrong** → Set `NODE_VERSION=20` in Environment
4. **Service not triggering** → Click Manual Deploy
