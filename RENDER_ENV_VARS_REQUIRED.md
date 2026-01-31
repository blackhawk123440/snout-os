# Required Render Environment Variables

## WEB Service Environment Variables

**CRITICAL - Set these in Render Dashboard → Your Service → Environment:**

### Authentication (REQUIRED)
```bash
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=<64+ character random string>
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 48
```

### Messaging Feature Flags
```bash
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snout-os-staging.onrender.com
```

### Build Verification
```bash
NEXT_PUBLIC_GIT_SHA=<commit-sha>
NEXT_PUBLIC_BUILD_TIME=<iso-timestamp>
```

### Database
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

## How to Set in Render

1. Go to: https://dashboard.render.com
2. Select your **Web Service** (not API service)
3. Click **Environment** tab
4. Click **Add Environment Variable** for each variable above
5. **IMPORTANT:** After adding all variables, click **Save Changes**
6. Render will automatically redeploy

## Verification

After deployment, visit:
- `https://snout-os-staging.onrender.com/api/auth/health`
- Should show: `NEXTAUTH_SECRET_PRESENT: true`, `NEXTAUTH_SECRET_VALID: true`

## Common Mistakes

❌ **Setting in API service instead of Web service**
✅ **Set in Web service (Next.js app)**

❌ **Not redeploying after adding variables**
✅ **Save Changes triggers auto-redeploy, or manually trigger**

❌ **Secret too short (< 32 characters)**
✅ **Use 64+ character secret (openssl rand -base64 48)**

❌ **NEXTAUTH_URL with trailing slash**
✅ **No trailing slash: `https://snout-os-staging.onrender.com`**
