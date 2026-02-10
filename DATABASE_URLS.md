# Database URL Configuration

## Two Database URLs Available

### Internal URL (for Render services on same account)
```
postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
```
- **Use for:** Render services (API, Worker, Web)
- **Why:** Faster, more secure, no external network routing
- **Domain:** `dpg-d5ab7v6r433s738a2isg-a` (internal Render network)

### External URL (for external services or local dev)
```
postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a.oregon-postgres.render.com/snout_os_db_staging
```
- **Use for:** Local development, external tools (e.g., Prisma Studio, database clients)
- **Why:** Accessible from outside Render's network
- **Domain:** `dpg-d5ab7v6r433s738a2isg-a.oregon-postgres.render.com` (public endpoint)

---

## Current Configuration

### API Service (`snout-os-api`)
- **Should use:** Internal URL
- **Current:** Check via verification script

### Worker Service (`snout-os-worker`)
- **Should use:** Internal URL
- **Current:** Check via verification script

### Web Service (`snout-os-staging`)
- **Should use:** Internal URL
- **Current:** ❌ NOT SET (needs to be added)

---

## Action Required

**Add `DATABASE_URL` to Web service using the INTERNAL URL:**

1. Go to https://dashboard.render.com → `snout-os-staging` service
2. Environment tab → Add Environment Variable
3. Key: `DATABASE_URL`
4. Value: `postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
5. Save Changes

---

## Verification

After adding, verify with:
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
python3 verify-env-vars.py
```

Expected result:
- ✅ DATABASE_URL: SET (correct database)
- ✅ All other variables correct
