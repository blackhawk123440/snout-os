# Exact Environment Variables for Your Render Services

## 🔵 WEB SERVICE: `snout-os-staging`

Go to: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/environment

Add these **exact** variables (one per line, click "Add Environment Variable" for each):

```
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=<generate with: openssl rand -base64 48>
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com
```

**Example with generated secret:**
```
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=JeBctxnIua976KOMQvZDg9qjF/4Xy3ncp/quiknbXBPKy5nFiOvsErmxIXtq+18a
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com
```

---

## 🔴 API SERVICE: `snout-os-api`

Go to: https://dashboard.render.com/web/srv-d62mrjpr0fns738rirdg/environment

Add these **exact** variables (one per line, click "Add Environment Variable" for each):

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
REDIS_URL=redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnuF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075
JWT_SECRET=<generate with: openssl rand -base64 48>
ENCRYPTION_KEY=<generate with: openssl rand -base64 32>
CORS_ORIGINS=https://snout-os-staging.onrender.com
PROVIDER_MODE=mock
```

**Example with generated secrets:**
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
REDIS_URL=redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnuF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075
JWT_SECRET=R7ZWUNSSXR+sR23+vx7FeatXxgsfuFwuIzqKfH34welEJ4FcCCNLU3TKAr35yv89
ENCRYPTION_KEY=PKPEn8ZbZ3LSV1XtinBd/BNY82USc+qAqggRiIxvpyc=
CORS_ORIGINS=https://snout-os-staging.onrender.com
PROVIDER_MODE=mock
```

---

## 🔧 WORKER SERVICE: `snout-os-worker`

Go to: https://dashboard.render.com/worker/srv-d63jnnmr433s73dqep70/environment

Add these **exact** variables (same as API, except no PORT or CORS_ORIGINS):

```
NODE_ENV=production
DATABASE_URL=postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
REDIS_URL=redis://default:1Q9X6fkfhN3ncZMSkrH8YT57ORkUOnuF@redis-11075.c61.us-east-1-3.ec2.cloud.redislabs.com:11075
JWT_SECRET=<same value as API service>
```

**Important:** Use the **SAME** `JWT_SECRET` value on both API and Worker services.

---

## 🔐 Generate Secrets

Run these commands locally to generate secrets:

```bash
# NEXTAUTH_SECRET (for Web service)
openssl rand -base64 48

# JWT_SECRET (for API and Worker services - use the SAME value)
openssl rand -base64 48

# ENCRYPTION_KEY (for API service only)
openssl rand -base64 32
```

---

## 📝 How to Add in Render Dashboard

1. Click the link above for each service
2. Scroll to "Environment Variables" section
3. Click "Add Environment Variable"
4. Enter the **Key** (left side): `NODE_ENV`
5. Enter the **Value** (right side): `production`
6. Click "Save Changes" (at the bottom)
7. Service will automatically redeploy

**Note:** Render uses `KEY=value` format. No spaces around the `=` sign in the value field.

---

## ✅ After Setting All Variables

1. Wait for services to redeploy (check "Events" tab)
2. Verify API health: `curl https://snout-os-api.onrender.com/health`
3. Run database migrations in Render shell
4. Run database seed in Render shell
