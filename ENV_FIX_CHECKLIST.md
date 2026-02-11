# Environment Variable Fix Checklist

## 🚨 CRITICAL ISSUES FOUND

### 1. Web Service: NEXTAUTH_URL has trailing newline
**Status:** ❌ CONFIRMED
- **Current:** `https://snout-os-staging.onrender.com\n` (38 chars, has newline)
- **Should be:** `https://snout-os-staging.onrender.com` (37 chars, no newline)
- **Fix:** Edit in Render, delete value completely, retype fresh

### 2. Web Service: JWT_SECRET is MISSING
**Status:** ❌ CONFIRMED
- **Current:** Not set
- **Required:** YES (BFF proxy needs it to mint API tokens)
- **Value:** Must match API/Worker: `o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU`
- **Fix:** Add `JWT_SECRET` to Web service with same value as API/Worker

### 3. Web Service: DATABASE_URL status unknown
**Status:** ⚠️ NEEDS VERIFICATION
- **Health endpoint doesn't expose it** (security measure)
- **Should be set:** YES (NextAuth needs it for login)
- **Expected value:** `postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
- **Action:** Verify in Render dashboard (screenshot shows it's set, but verify no trailing newline)

---

## ✅ VERIFIED CORRECT

### Web Service
- ✅ `NEXT_PUBLIC_API_URL` = `https://snout-os-api.onrender.com` (correct)

### API Service
- ✅ Health endpoint returns 200 OK
- ✅ Service is running

---

## 📋 COMPLETE FIX INSTRUCTIONS

### Step 1: Fix Web Service Environment Variables

**Go to:** https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/env

#### Fix 1: Remove trailing newline from NEXTAUTH_URL
1. Find `NEXTAUTH_URL` in the list
2. Click to edit
3. **Delete the entire value**
4. **Type fresh:** `https://snout-os-staging.onrender.com`
5. **Do NOT paste** - type it to avoid hidden characters
6. Save

#### Fix 2: Add JWT_SECRET (if missing)
1. Click "+ New" to add environment variable
2. **Key:** `JWT_SECRET`
3. **Value:** `o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU`
4. **Important:** This must be **exactly the same** as API and Worker services
5. Save

#### Fix 3: Verify DATABASE_URL
1. Find `DATABASE_URL` in the list
2. Verify value is: `postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
3. If it has trailing newline, fix it (delete and retype)
4. If missing, add it

#### Fix 4: Verify PUBLIC_BASE_URL (if present)
1. Find `PUBLIC_BASE_URL` in the list
2. Should be: `https://snout-os-staging.onrender.com` (no trailing newline)
3. If it has trailing newline, fix it

#### Final Step: Save All Changes
- Click "Save Changes" at the bottom
- Render will auto-redeploy

---

### Step 2: Verify API Service Environment Variables

**Go to:** https://dashboard.render.com/web/srv-d62mrjpr0fns738rirdg/env

**Verify these are set:**
- ✅ `NODE_ENV` = `production`
- ✅ `PORT` = `3001`
- ✅ `DATABASE_URL` = `postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
- ✅ `REDIS_URL` = `redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075`
- ✅ `JWT_SECRET` = `o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU`
- ✅ `ENCRYPTION_KEY` = `RE0/gL/R8KD5xcT9IJyxaEy1laFxraeIuDxS5vvSEtY=`
- ✅ `CORS_ORIGINS` = `https://snout-os-staging.onrender.com`
- ✅ `PROVIDER_MODE` = `mock`

---

### Step 3: Verify Worker Service Environment Variables

**Go to:** https://dashboard.render.com/worker/srv-d63jnnmr433s73dqep70/env

**Verify these are set:**
- ✅ `NODE_ENV` = `production`
- ✅ `DATABASE_URL` = `postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
- ✅ `REDIS_URL` = `redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075`
- ✅ `JWT_SECRET` = `o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU` (MUST MATCH API)

---

## ✅ Verification After Fixes

After making changes and waiting for redeploy:

### Test 1: Check NEXTAUTH_URL (no newline)
```bash
curl -s https://snout-os-staging.onrender.com/api/auth/health | python3 -c "import sys, json; d=json.load(sys.stdin); url = d['env']['NEXTAUTH_URL_RAW']; print('Length:', len(url), '(should be 37)'); print('Has newline:', '\n' in url)"
```

**Expected:** Length: 37, Has newline: False

### Test 2: Check API Health
```bash
curl -i https://snout-os-api.onrender.com/health
```

**Expected:** HTTP 200

### Test 3: Test BFF Proxy (requires login)
1. Log in to `https://snout-os-staging.onrender.com`
2. Open DevTools → Network
3. Navigate to `/messages`
4. Check that `/api/messages/threads` request:
   - Goes to `snout-os-staging.onrender.com/api/...` (not API directly)
   - Returns 200 (not 401/403)

---

## 📝 Summary of Required Values

### Web Service (`snout-os-staging`)
```
DATABASE_URL=postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
JWT_SECRET=o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU
NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=tZ1YxfCsbp3jSATNIeE30Qw3iwV9ZjzWRN4evJkyjUG7TdEDmwPe8tHUkkcE2TQiARq6EFKR1E8mgoF08OCusw==
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
PUBLIC_BASE_URL=https://snout-os-staging.onrender.com
```

### API Service (`snout-os-api`)
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
REDIS_URL=redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075
JWT_SECRET=o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU
ENCRYPTION_KEY=RE0/gL/R8KD5xcT9IJyxaEy1laFxraeIuDxS5vvSEtY=
CORS_ORIGINS=https://snout-os-staging.onrender.com
PROVIDER_MODE=mock
```

### Worker Service (`snout-os-worker`)
```
NODE_ENV=production
DATABASE_URL=postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
REDIS_URL=redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075
JWT_SECRET=o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU
```

---

## ⚠️ CRITICAL: JWT_SECRET Must Match

**All three services (Web, API, Worker) MUST have the same `JWT_SECRET` value:**
```
o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU
```

If they don't match:
- BFF proxy on Web cannot mint tokens that API can verify
- All authenticated API calls will fail with 401 Unauthorized
