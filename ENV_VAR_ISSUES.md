# Environment Variable Issues Found

## ❌ CRITICAL ISSUES

### Web Service (`snout-os-staging`)

1. **JWT_SECRET is set (should NOT be)**
   - **Current:** `JWT_SECRET = R7ZWUNSSXR+sR23+vx7FeatXxgsfuFwuIzqKfH34welEJ4FcCCNLU3TKAr35yv89`
   - **Action:** DELETE this variable from Web service
   - **Reason:** Web uses `NEXTAUTH_SECRET`, not `JWT_SECRET`. Only API/Worker use `JWT_SECRET`.

2. **DATABASE_URL is MISSING (REQUIRED)**
   - **Current:** Not set
   - **Action:** ADD `DATABASE_URL` to Web service
   - **Value:** `postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
   - **Reason:** NextAuth needs database access to verify user credentials during login.

3. **NEXTAUTH_URL has trailing newline**
   - **Current:** `https://snout-os-staging.onrender.com\n`
   - **Action:** Edit and remove the trailing newline
   - **Correct:** `https://snout-os-staging.onrender.com`

4. **NEXT_PUBLIC_BASE_URL has trailing newline**
   - **Current:** `https://snout-os-staging.onrender.com\n`
   - **Action:** Edit and remove the trailing newline
   - **Correct:** `https://snout-os-staging.onrender.com`

---

## ✅ CORRECT CONFIGURATIONS

### API Service (`snout-os-api`)
All variables are correctly set:
- ✅ DATABASE_URL
- ✅ REDIS_URL
- ✅ JWT_SECRET
- ✅ ENCRYPTION_KEY
- ✅ CORS_ORIGINS
- ✅ PROVIDER_MODE

### Worker Service (`snout-os-worker`)
All variables are correctly set:
- ✅ DATABASE_URL
- ✅ REDIS_URL
- ✅ JWT_SECRET (matches API)

---

## 🔧 FIX INSTRUCTIONS

### Step 1: Fix Web Service Environment Variables

1. Go to https://dashboard.render.com
2. Click on `snout-os-staging` service
3. Go to "Environment" tab
4. **DELETE** `JWT_SECRET` variable
5. **ADD** `DATABASE_URL` with value:
   ```
   postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
   ```
6. **EDIT** `NEXTAUTH_URL` - remove any trailing newlines/whitespace
   - Should be exactly: `https://snout-os-staging.onrender.com`
7. **EDIT** `NEXT_PUBLIC_BASE_URL` - remove any trailing newlines/whitespace
   - Should be exactly: `https://snout-os-staging.onrender.com`
8. Click "Save Changes" (triggers redeploy)

### Step 2: Verify After Redeploy

After the web service redeploys, verify:
```bash
curl https://snout-os-staging.onrender.com/api/auth/health
```

Should return:
```json
{
  "status": "ok",
  "NEXTAUTH_URL": "https://snout-os-staging.onrender.com",
  "NEXT_PUBLIC_API_URL": "https://snout-os-api.onrender.com",
  "DATABASE_URL_set": true
}
```

---

## 📋 CORRECT WEB SERVICE ENV VARS (Final State)

```
DATABASE_URL = postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
NEXT_PUBLIC_API_URL = https://snout-os-api.onrender.com
NEXTAUTH_URL = https://snout-os-staging.onrender.com
NEXTAUTH_SECRET = tZ1YxfCsbp3jSATNIeE30Qw3iwV9ZjzWRN4evJkyjUG7TdEDmwPe8tHUkkcE2TQiARq6EFKR1E8mgoF08OCusw==
NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true
```

**Database URL Notes:**
- **Internal URL** (for Render services): `postgresql://...@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
- **External URL** (for local dev): `postgresql://...@dpg-d5ab7v6r433s738a2isg-a.oregon-postgres.render.com/snout_os_db_staging`
- Use the **internal URL** for the Web service (same as API/Worker)

**DO NOT SET:**
- ❌ JWT_SECRET (only for API/Worker)
- ❌ ENCRYPTION_KEY (only for API)
- ❌ REDIS_URL (only for API/Worker)
