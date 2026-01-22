# Render DATABASE_URL Configuration

## Your DATABASE_URL for Render

Based on your Supabase configuration, use this exact value:

```
postgresql://postgres.ktmarxugcepkgwgsgifx:n5XO1xtCuxg23G6J@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## How to Set in Render

1. Go to: https://dashboard.render.com
2. Select service: `snout-os-staging`
3. Click **Environment** tab
4. Click **Add Environment Variable**
5. **Key:** `DATABASE_URL`
6. **Value:** (paste the URL above)
7. Click **Save Changes**

## Additional Required Variables

Also add these:

### NEXTAUTH_URL
```
https://snout-os-staging.onrender.com
```

### NEXTAUTH_SECRET
Generate a random secret:
```bash
openssl rand -base64 32
```

Or use this one (for staging only):
```
staging-secret-key-change-in-production-2024
```

### OPENPHONE_API_KEY
(If you have one - optional for now)

## Build Command Fix

In **Settings** → **Build Command**, change to:
```bash
npm install && npm run build
```

## After Setting Variables

1. Render will auto-deploy
2. Watch build logs
3. Should see: `✔ Generated Prisma Client` and `✓ Compiled successfully`

## Security Note

⚠️ **Important:** This password is now in your git history. Consider:
- Rotating the database password in Supabase
- Using Render's secret management
- Never commit passwords to git
