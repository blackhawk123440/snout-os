# Render Environment Variables - Quick Reference

## Your Actual Values

**Database URL:**
```
postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
```

**Redis URL:**
```
redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnuF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075
```

**Secrets (from .secrets.txt):**
- JWT_SECRET: `o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU`
- ENCRYPTION_KEY: `RE0/gL/R8KD5xcT9IJyxaEy1laFxraeIuDxS5vvSEtY=`
- NEXTAUTH_SECRET: `tZ1YxfCsbp3jSATNIeE30Qw3iwV9ZjzWRN4evJkyjUG7TdEDmwPe8tHUkkcE2TQiARq6EFKR1E8mgoF08OCusw==`

---

## ⚠️ IMPORTANT: Build Command Fix

Both API and Worker services need Prisma client generated and native modules rebuilt before build. Use this build command:

```
pnpm install && pnpm --filter @snoutos/shared build && cd apps/api && pnpm prisma generate && cd ../.. && pnpm rebuild --filter @snoutos/api && pnpm --filter @snoutos/api build
```

**Note:** `pnpm rebuild --filter @snoutos/api` rebuilds all native modules (including bcrypt) for the API package from the workspace root, ensuring correct paths.

---

## Service 1: snout-os-api

**Environment Variables:**

```
NODE_ENV = production
PORT = 3001
DATABASE_URL = postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
REDIS_URL = redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnuF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075
JWT_SECRET = o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU
ENCRYPTION_KEY = RE0/gL/R8KD5xcT9IJyxaEy1laFxraeIuDxS5vvSEtY=
CORS_ORIGINS = https://snout-os-staging.onrender.com
PROVIDER_MODE = mock
```

---

## Service 2: snout-os-worker

**Environment Variables:**

```
NODE_ENV = production
DATABASE_URL = postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
REDIS_URL = redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnuF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075
JWT_SECRET = o6OatgV6N9LlMgeauvp012pH8gaI5jVjoCvS/7cRK9z3S48Osx0WkGI5IZXuSpzU
```

**⚠️ IMPORTANT:** `JWT_SECRET` must be **exactly the same** as the API service.

---

## Service 3: snout-os-web (or snout-os-staging)

**Environment Variables:**

```
NEXT_PUBLIC_API_URL = https://snout-os-api.onrender.com
NEXTAUTH_URL = https://snout-os-staging.onrender.com
NEXTAUTH_SECRET = tZ1YxfCsbp3jSATNIeE30Qw3iwV9ZjzWRN4evJkyjUG7TdEDmwPe8tHUkkcE2TQiARq6EFKR1E8mgoF08OCusw==
NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true
```

**⚠️ CRITICAL:** Do NOT set `JWT_SECRET` on Web service. Web uses `NEXTAUTH_SECRET` (different value).

---

## Summary Table

| Variable | API | Worker | Web |
|----------|-----|--------|-----|
| `DATABASE_URL` | ✅ | ✅ | ❌ |
| `REDIS_URL` | ✅ | ✅ | ❌ |
| `JWT_SECRET` | ✅ | ✅ (same) | ❌ |
| `ENCRYPTION_KEY` | ✅ | ❌ | ❌ |
| `CORS_ORIGINS` | ✅ | ❌ | ❌ |
| `PROVIDER_MODE` | ✅ | ❌ | ❌ |
| `NEXT_PUBLIC_API_URL` | ❌ | ❌ | ✅ |
| `NEXTAUTH_URL` | ❌ | ❌ | ✅ |
| `NEXTAUTH_SECRET` | ❌ | ❌ | ✅ |
| `NEXT_PUBLIC_ENABLE_MESSAGING_V1` | ❌ | ❌ | ✅ |

---

## Copy-Paste Checklist

### ✅ API Service (`snout-os-api`)
- [ ] NODE_ENV = production
- [ ] PORT = 3001
- [ ] DATABASE_URL = (your value above)
- [ ] REDIS_URL = (your value above)
- [ ] JWT_SECRET = (your value above)
- [ ] ENCRYPTION_KEY = (your value above)
- [ ] CORS_ORIGINS = https://snout-os-staging.onrender.com
- [ ] PROVIDER_MODE = mock

### ✅ Worker Service (`snout-os-worker`)
- [ ] NODE_ENV = production
- [ ] DATABASE_URL = (same as API)
- [ ] REDIS_URL = (same as API)
- [ ] JWT_SECRET = (same as API - must match exactly)

### ✅ Web Service (`snout-os-staging` or `snout-os-web`)
- [ ] NEXT_PUBLIC_API_URL = https://snout-os-api.onrender.com
- [ ] NEXTAUTH_URL = https://snout-os-staging.onrender.com
- [ ] NEXTAUTH_SECRET = (your value above)
- [ ] NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true

---

## Notes

1. **Database URL:** Use the full PostgreSQL connection string (internal URL from Render)
2. **Redis URL:** Use your Redis Cloud connection string (external URL is fine)
3. **JWT_SECRET:** Must be identical in API and Worker services
4. **NEXTAUTH_SECRET:** Only used by Web service (different from JWT_SECRET)
