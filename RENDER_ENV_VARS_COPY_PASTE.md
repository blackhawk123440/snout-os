# Render Environment Variables - Copy & Paste Ready

## 🔵 WEB SERVICE (Next.js)

Copy these into Render Dashboard → **Web Service** → **Environment** tab:

```
NEXTAUTH_URL=https://snout-os-web.onrender.com
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET_HERE
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com
```

**⚠️ IMPORTANT:** 
- Replace `snout-os-web.onrender.com` with your actual web service URL
- Replace `snout-os-api.onrender.com` with your actual API service URL
- Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 48`

---

## 🔴 API SERVICE (NestJS)

Copy these into Render Dashboard → **API Service** → **Environment** tab:

```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
REDIS_URL=redis://default:password@host:port
JWT_SECRET=YOUR_JWT_SECRET_HERE
ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY_HERE
PROVIDER_MODE=mock
ENABLE_MESSAGING_V1=true
ALLOW_DEV_SEED=true
```

**⚠️ IMPORTANT:**
- Replace `DATABASE_URL` with your actual Render PostgreSQL connection string
- Replace `REDIS_URL` with your actual Render Redis connection string
- Generate `JWT_SECRET` using: `openssl rand -base64 48`
- Generate `ENCRYPTION_KEY` using: `openssl rand -base64 32`
- If using Twilio, add: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

---

## 📋 Quick Copy-Paste Format

### For Web Service:

```
NEXTAUTH_URL=https://snout-os-web.onrender.com
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET_HERE
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com
```

### For API Service:

```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
REDIS_URL=redis://default:password@host:port
JWT_SECRET=YOUR_JWT_SECRET_HERE
ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY_HERE
PROVIDER_MODE=mock
ENABLE_MESSAGING_V1=true
ALLOW_DEV_SEED=true
```

---

## 🔐 Generate Secrets (Run these commands):

```bash
# NEXTAUTH_SECRET (for Web service)
openssl rand -base64 48

# JWT_SECRET (for API service)
openssl rand -base64 48

# ENCRYPTION_KEY (for API service)
openssl rand -base64 32
```

---

## ✅ After Setting Variables:

1. Click **Save Changes** in Render
2. Service will auto-redeploy
3. Verify with: `curl https://snout-os-web.onrender.com/api/auth/health`
