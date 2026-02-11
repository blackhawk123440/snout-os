# Environment Variables Verification

## ✅ Confirmed from Screenshots

### Web Service (`snout-os-staging`) - All Required Variables Present:

1. ✅ `JWT_SECRET` - SET (required for BFF proxy to mint API tokens)
2. ✅ `NEXT_PUBLIC_API_URL` - `https://snout-os-api.onrender.com` ✓
3. ✅ `NEXTAUTH_URL` - `https://snout-os-staging.onrender.com` ✓
4. ✅ `NEXTAUTH_SECRET` - SET ✓
5. ✅ `DATABASE_URL` - SET (PostgreSQL connection string) ✓
6. ✅ `NODE_VERSION` - `20` ✓

### Additional Variables (Good to Have):
- `NEXT_PUBLIC_BASE_URL` - `https://snout-os-staging.onrender.com` ✓
- `NEXT_PUBLIC_APP_URL` - `https://snout-os-staging.onrender.com` ✓
- `NODE_ENV` - `production` ✓
- Various feature flags (ENABLE_*) ✓

## 🔍 What to Check Next

Since environment variables are correct and local build passes, the issue is likely:

1. **Build Logs on Render** - Need to see the actual error
2. **Build Cache** - May need to clear
3. **Runtime Error** - Build succeeds but app crashes on start

## 📋 Next Steps

1. **Check Render Build Logs**:
   - Go to Render Dashboard → `snout-os-staging` → Logs
   - Look for the most recent build attempt
   - Copy the full error message

2. **Check Runtime Logs** (if build succeeds):
   - Go to Render Dashboard → `snout-os-staging` → Logs
   - Look for runtime errors after deployment

3. **Clear Build Cache**:
   - Render Dashboard → `snout-os-staging` → Settings
   - Scroll to "Build Cache" section
   - Click "Clear Build Cache"
   - Trigger a new deploy

4. **Verify Build Command**:
   - Settings → Build Command should be: `npm install && npm run build`
   - Root Directory should be: `/` (root)

## 🚨 Common Issues After 100+ Failed Deploys

1. **Stale Build Cache** - Clear it
2. **Wrong Build Command** - Verify it matches exactly
3. **Node Version Mismatch** - Should be 20 (you have this)
4. **Memory Limit** - Build might be running out of memory
5. **Timeout** - Build might be taking too long

## 📝 What I Need to Diagnose

Please provide:
1. **Full build log** from Render (the error message)
2. **Runtime logs** (if build succeeds but app crashes)
3. **Build command** from Settings (screenshot or copy/paste)

With that information, I can pinpoint the exact issue.
