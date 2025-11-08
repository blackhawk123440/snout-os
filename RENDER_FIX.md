# Render Deployment Fix

## Issue: "Could not find Prisma Schema"

This has been fixed! The following changes were made:

### 1. Moved Prisma to Production Dependencies
**Changed in `package.json`:**
- Moved `prisma` from `devDependencies` to `dependencies`
- This ensures Prisma CLI is available during the Render build process

### 2. Updated Database Provider
**Changed in `prisma/schema.prisma`:**
- Changed `provider = "sqlite"` to `provider = "postgresql"`
- Render uses PostgreSQL, not SQLite

### 3. Updated Build Command
**Changed in `render.yaml`:**
- Updated to: `npm install && npx prisma generate --schema=./prisma/schema.prisma && npm run build`
- Explicitly specifies schema location

## Deployment Steps (Updated)

### 1. Commit These Fixes
```bash
git add .
git commit -m "Fix Prisma schema error for Render deployment"
git push origin main
```

### 2. Deploy to Render
1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Click "Apply"

### 3. Render Will Automatically
- ✅ Create PostgreSQL database
- ✅ Install dependencies (including Prisma)
- ✅ Generate Prisma client
- ✅ Build application
- ✅ Deploy to production

### 4. Add Environment Variables
In Render dashboard → Your service → Environment:

```
OPENPHONE_API_KEY=your_key_here
OPENPHONE_NUMBER_ID=your_number_here
```

Optional:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
OWNER_PERSONAL_PHONE=+12025551234
OWNER_OPENPHONE_PHONE=+12025551234
```

### 5. Initialize Database
After deployment, in Render dashboard → Shell:

```bash
npx prisma db push
npm run db:seed
```

## What Was Fixed

| Issue | Solution |
|-------|----------|
| Prisma not found during build | Moved `prisma` to production dependencies |
| Schema file not detected | Added explicit `--schema` flag to build command |
| SQLite vs PostgreSQL | Updated schema to use PostgreSQL provider |
| Build command optimization | Changed to `npm install` for production build |

## Verify Deployment

After deployment:
1. Visit: `https://your-app.onrender.com/api/health`
2. Should see: `{"status": "ok"}`
3. Check database: `https://your-app.onrender.com/api/integrations/test/database`

## Troubleshooting

### If build still fails:
1. Check Render logs for specific error
2. Verify `prisma/schema.prisma` file exists
3. Ensure `DATABASE_URL` is set (auto-set by Render)
4. Try manual redeploy in Render dashboard

### If database connection fails:
1. Wait 2-3 minutes for database to fully start
2. Check DATABASE_URL in environment variables
3. Verify PostgreSQL database is running in Render

### If migrations fail:
Run manually in Render Shell:
```bash
npx prisma generate
npx prisma db push --accept-data-loss
```

## Success Indicators

✅ Build completes without errors
✅ Health check returns 200
✅ Database connection successful
✅ Dashboard loads correctly
✅ Booking form accessible

---

**The Prisma schema error is now fixed! Push these changes and redeploy.**

