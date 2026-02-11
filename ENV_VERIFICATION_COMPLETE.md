# Complete Environment Variable Verification

## ✅ Required Variables by Service

### 🔵 WEB SERVICE: `snout-os-staging`
**Dashboard:** https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/env

**REQUIRED:**
- ✅ `DATABASE_URL` = `postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
- ✅ `NEXT_PUBLIC_API_URL` = `https://snout-os-api.onrender.com`
- ✅ `NEXTAUTH_URL` = `https://snout-os-staging.onrender.com` (NO trailing newline)
- ✅ `NEXTAUTH_SECRET` = `tZ1YxfCsbp3jSATNIeE30Qw3iwV9ZjzWRN4evJkyjUG7TdEDmwPe8tHUkkcE2TQiARq6EFKR1E8mgoF08OCusw==`
- ✅ `NEXT_PUBLIC_ENABLE_MESSAGING_V1` = `true`
- ✅ `JWT_SECRET` = (for BFF proxy to mint API tokens) - **MUST MATCH API SERVICE**

**OPTIONAL (but present in screenshots):**
- `NODE_ENV` = `production`
- `NODE_VERSION` = `20`
- `PUBLIC_BASE_URL` = `https://snout-os-staging.onrender.com` (should match NEXTAUTH_URL)
- `ENCRYPTION_KEY` = (if used by web service)
- Various feature flags (ENABLE_*)
- Provider configs (TWILIO_*, OPENPHONE_*, STRIPE_*)

**MUST NOT HAVE:**
- ❌ `JWT_SECRET` should NOT be set (wait, actually it IS needed for BFF proxy!)

**⚠️ CRITICAL ISSUE:**
- `NEXTAUTH_URL` has trailing newline - **FIX THIS FIRST**

---

### 🔴 API SERVICE: `snout-os-api`
**Dashboard:** https://dashboard.render.com/web/srv-d62mrjpr0fns738rirdg/env

**REQUIRED:**
- ✅ `NODE_ENV` = `production`
- ✅ `PORT` = `3001`
- ✅ `DATABASE_URL` = `postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
- ✅ `REDIS_URL` = `redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075`
- ✅ `JWT_SECRET` = `o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU` (MUST MATCH WEB & WORKER)
- ✅ `ENCRYPTION_KEY` = `RE0/gL/R8KD5xcT9IJyxaEy1laFxraeIuDxS5vvSEtY=`
- ✅ `CORS_ORIGINS` = `https://snout-os-staging.onrender.com`
- ✅ `PROVIDER_MODE` = `mock`

---

### 🔧 WORKER SERVICE: `snout-os-worker`
**Dashboard:** https://dashboard.render.com/worker/srv-d63jnnmr433s73dqep70/env

**REQUIRED:**
- ✅ `NODE_ENV` = `production`
- ✅ `DATABASE_URL` = `postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
- ✅ `REDIS_URL` = `redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075`
- ✅ `JWT_SECRET` = `o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU` (MUST MATCH API)

---

## 🔍 Verification Steps

### Step 1: Check Web Service NEXTAUTH_URL
```bash
curl -s https://snout-os-staging.onrender.com/api/auth/health | python3 -c "import sys, json; data=json.load(sys.stdin); url = data['env']['NEXTAUTH_URL_RAW']; print('Length:', len(url), '(should be 37)'); print('Has newline:', '\n' in url or '\r' in url); print('Value:', repr(url))"
```

**Expected:** Length: 37, Has newline: False

### Step 2: Check Web Service JWT_SECRET
The BFF proxy (`src/app/api/[...path]/route.ts`) uses `JWT_SECRET` to mint API tokens. Check if it's set:
```bash
curl -s https://snout-os-staging.onrender.com/api/auth/health | python3 -c "import sys, json; data=json.load(sys.stdin); print('JWT_SECRET set:', 'JWT_SECRET' in data.get('env', {}))"
```

**Expected:** JWT_SECRET set: True (because BFF proxy needs it)

### Step 3: Verify API Health
```bash
curl -i https://snout-os-api.onrender.com/health
```

**Expected:** HTTP 200 with `{"status":"ok"}`

### Step 4: Verify JWT_SECRET Match
**CRITICAL:** `JWT_SECRET` must be **identical** on:
- Web service (for BFF proxy)
- API service
- Worker service

If they don't match, the BFF proxy will mint tokens that the API cannot verify.

---

## 🚨 Issues Found (from screenshots)

1. **NEXTAUTH_URL trailing newline** - CONFIRMED
   - **Fix:** Edit in Render, delete value, retype: `https://snout-os-staging.onrender.com`

2. **JWT_SECRET on Web service** - NEEDS VERIFICATION
   - **Check:** Is `JWT_SECRET` set on Web service?
   - **If not set:** ADD it with the same value as API/Worker
   - **If set but different:** UPDATE to match API/Worker

3. **PUBLIC_BASE_URL vs NEXTAUTH_URL** - NEEDS VERIFICATION
   - Both should be `https://snout-os-staging.onrender.com`
   - If `PUBLIC_BASE_URL` has trailing newline, fix it too

---

## ✅ Correct Final State

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

## 🔧 Immediate Actions

1. **Fix NEXTAUTH_URL trailing newline** (Web service)
2. **Verify JWT_SECRET is set on Web service** (and matches API/Worker)
3. **Verify PUBLIC_BASE_URL** (no trailing newline)
4. **Verify all three services have correct DATABASE_URL**
5. **Verify all three services have correct REDIS_URL** (API & Worker only)
6. **Verify JWT_SECRET matches across Web, API, Worker**
