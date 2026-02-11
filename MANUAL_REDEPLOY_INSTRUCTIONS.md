# Manual Redeploy Instructions (If Auto-Deploy Stuck)

## Current Status
- ✅ Code pushed to GitHub (commit `5e3001c`)
- ❌ Render hasn't deployed it yet (old code still running)

## Option 1: Wait for Auto-Deploy (Recommended)
Render should auto-detect the push and deploy within 5-10 minutes. Check:
- https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/logs
- Look for "Build started" or "Deploying"

## Option 2: Manual Redeploy (If Stuck)

If auto-deploy hasn't started after 10 minutes:

1. **Go to Render Dashboard:**
   - https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg

2. **Manual Deploy:**
   - Click **"Manual Deploy"** button (top right)
   - Select **"Deploy latest commit"**
   - Or select commit `5e3001c` if available

3. **Wait for Build:**
   - Monitor the **Logs** tab
   - Should see: "Building..." → "Build successful" → "Deployed"

4. **Verify Deployment:**
   ```bash
   curl -s https://snout-os-staging.onrender.com/api/auth/health | python3 -c "import sys, json; d=json.load(sys.stdin); print('New code deployed:', 'JWT_SECRET_PRESENT' in d.get('env', {}))"
   ```
   
   Should show: `New code deployed: True`

## Option 3: Clear Build Cache (If Build Fails)

If the build fails:

1. Go to: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/settings
2. Scroll to **"Build & Deploy"** section
3. Click **"Clear build cache"**
4. Click **"Save Changes"**
5. This triggers a fresh build

## What to Look For in Logs

**Good signs:**
- ✅ "Building..."
- ✅ "Build successful"
- ✅ "Deployed"
- ✅ Commit hash matches `5e3001c`

**Bad signs:**
- ❌ "Build failed"
- ❌ "Error: ..."
- ❌ Stuck on "Building..." for >10 minutes

## After Deployment Completes

Once you see `New code deployed: True`:

1. **Test NEXTAUTH_URL:**
   ```bash
   curl -s https://snout-os-staging.onrender.com/api/auth/health | python3 -c "import sys, json; d=json.load(sys.stdin); url = d['env']['NEXTAUTH_URL_RAW']; print('Length:', len(url), '(should be 37)'); print('Has newline:', '\n' in url)"
   ```
   
   Should show: `Length: 37`, `Has newline: False`

2. **Test Login:**
   - Go to: https://snout-os-staging.onrender.com/login
   - Email: `leah2maria@gmail.com`
   - Password: `Saint214!`

## Why It Might Be Stuck

- Render queue is busy (wait a bit longer)
- Build is failing silently (check logs)
- Auto-deploy is disabled (check Settings → Auto-Deploy)
- Git webhook not configured (check Settings → Build & Deploy)
