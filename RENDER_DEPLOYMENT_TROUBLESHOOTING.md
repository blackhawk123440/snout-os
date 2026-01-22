# Render Deployment Troubleshooting

## Common Issues and Fixes

### Issue 1: Build Command Error

**Problem:** Build command includes `db push` which fails without DATABASE_URL

**Fix:** In Render Dashboard → Settings → Build Command, use:
```bash
npm install && npm run build
```

**Why:** 
- `prisma generate` runs automatically in `postinstall` hook
- `db push` should only run manually, not during build
- `npm run build` already includes `prisma generate`

### Issue 2: Missing DATABASE_URL

**Error:** `P1012: the URL must start with the protocol postgresql://`

**Fix:** Add `DATABASE_URL` in Render → Environment:
```
postgresql://postgres.ktmarxugcepkgwgsgifx:YOUR_PASSWORD@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Issue 3: Build Succeeds But Service Won't Start

**Check:**
1. **Start Command** should be: `npm start`
2. **Node Version** should be: `20` (set in Environment: `NODE_VERSION=20`)
3. **Port** - Next.js uses `PORT` env var (Render sets this automatically)

### Issue 4: Environment Variables Not Loading

**Check:**
- Variables are set in **Environment** tab (not Settings)
- No typos in variable names
- Values don't have extra quotes (Render adds them automatically)
- Click **Save Changes** after adding variables

### Issue 5: Prisma Client Not Generated

**Symptoms:** Runtime errors about Prisma Client

**Fix:** Ensure build command includes:
```bash
npm install && npm run build
```

The `postinstall` script runs `prisma generate` automatically.

### Issue 6: Build Timeout

**Symptoms:** Build takes too long and times out

**Fix:**
- Remove unnecessary build steps
- Use: `npm install && npm run build` (simplest)
- Check for large dependencies

## Step-by-Step Deployment Checklist

### Pre-Deployment
- [ ] Code is pushed to `main` branch
- [ ] All environment variables documented
- [ ] Build command is correct

### Render Setup
- [ ] Service created (Web Service)
- [ ] Connected to GitHub repo
- [ ] Branch set to `main`
- [ ] Root Directory: `snout-os` (if repo root is parent)

### Environment Variables (Required)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Your Render service URL
- [ ] `NEXTAUTH_SECRET` - Random 32+ character string
- [ ] `OPENPHONE_API_KEY` - If using OpenPhone

### Environment Variables (Optional - for messaging)
- [ ] `ENABLE_MESSAGING_V1=false` (default)
- [ ] `TWILIO_*` variables (only if enabling messaging)

### Build Settings
- [ ] **Build Command:** `npm install && npm run build`
- [ ] **Start Command:** `npm start`
- [ ] **Node Version:** `20` (in Environment tab: `NODE_VERSION=20`)

### Post-Deployment
- [ ] Build logs show: `✔ Generated Prisma Client`
- [ ] Build logs show: `✓ Compiled successfully`
- [ ] Service shows "Live" status
- [ ] Can access service URL
- [ ] No runtime errors in logs

## Quick Test Commands

After deployment, test:
```bash
# Check if service is up
curl https://snout-os-staging.onrender.com

# Check diagnostics (if messaging enabled)
curl https://snout-os-staging.onrender.com/api/messages/diagnostics
```

## Getting Build Logs

1. Go to Render Dashboard
2. Click your service
3. Click **Logs** tab
4. Look for errors in build or runtime logs

## Common Error Messages

### "P1012: URL must start with postgresql://"
→ Missing or invalid `DATABASE_URL`

### "Cannot find module '@/lib/...'"
→ Build didn't complete, check build logs

### "Port already in use"
→ Render handles this automatically, ignore

### "ENOENT: no such file or directory"
→ Check Root Directory setting (should be `snout-os` if repo has parent folder)

## Still Not Working?

1. **Check Build Logs** - Look for first error message
2. **Check Runtime Logs** - After build succeeds, check runtime errors
3. **Verify Environment Variables** - Double-check all required vars are set
4. **Test Locally First** - Run `npm run build` locally to catch errors early

## Contact Points

- Render Docs: https://render.com/docs
- Render Support: https://render.com/support
- Check service logs in Render dashboard
