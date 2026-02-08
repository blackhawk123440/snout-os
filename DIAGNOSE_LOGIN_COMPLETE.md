# Complete Login Diagnosis

## Step-by-Step Diagnosis

### Step 1: Check Web Service Environment Variables

**Go to**: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/environment

**Required variables:**
- ✅ `DATABASE_URL` - MUST be set
- ✅ `NEXTAUTH_SECRET` - MUST be set
- ✅ `NEXTAUTH_URL` - Should be `https://snout-os-web.onrender.com`
- ✅ `NEXT_PUBLIC_API_URL` - Should be `https://snout-os-api.onrender.com`

**If DATABASE_URL is missing**, add:
```
postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
```

### Step 2: Check Web Service Logs

**Go to**: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/logs

**Try logging in**, then look for:
- `[NextAuth] Database error during authorize:` - Database connection issue
- `PrismaClientInitializationError` - DATABASE_URL missing or invalid
- `Cannot find module '@prisma/client'` - Prisma not generated
- Any other errors

### Step 3: Verify User Exists in Database

**Open Render API service shell**: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/shell

**Run**:
```bash
cd /opt/render/project/src/enterprise-messaging-dashboard/apps/api
psql $DATABASE_URL -c "SELECT email, role, active, \"passwordHash\" IS NOT NULL as has_password, LENGTH(\"passwordHash\") as hash_len FROM \"User\" WHERE email = 'leah2maria@gmail.com';"
```

**Expected**: One row with `has_password = true`, `hash_len = 60`

**If no rows or hash_len is NULL**: User doesn't exist or password not set. Run fix below.

### Step 4: Verify Password Hash

**In API shell, run**:
```bash
psql $DATABASE_URL -c "SELECT SUBSTRING(\"passwordHash\", 1, 30) as hash_start FROM \"User\" WHERE email = 'leah2maria@gmail.com';"
```

**Expected**: `$2b$10$shlVzw6CFY87F2WZV/ieru`

**If different**: Password hash is wrong. Run fix below.

### Step 5: Test Database Connection from Web Service

**Create a test API route** (temporary) to verify database access:

Add to `src/app/api/test-db/route.ts`:
```typescript
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "leah2maria@gmail.com" },
      select: { email: true, role: true, passwordHash: !!true },
    });
    return NextResponse.json({ 
      success: true, 
      user: user ? { email: user.email, role: user.role, hasPassword: !!user.passwordHash } : null,
      dbUrl: process.env.DATABASE_URL ? "SET" : "NOT SET"
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      dbUrl: process.env.DATABASE_URL ? "SET" : "NOT SET"
    }, { status: 500 });
  }
}
```

**Test**: `curl https://snout-os-web.onrender.com/api/test-db`

**Expected**: `{"success":true,"user":{"email":"leah2maria@gmail.com",...},"dbUrl":"SET"}`

### Step 6: Fix User Password (if needed)

**In API shell**:
```bash
psql $DATABASE_URL << 'EOF'
DO $$
DECLARE
  org_id TEXT;
  user_id TEXT;
  password_hash TEXT := '$2b$10$shlVzw6CFY87F2WZV/ieruwuNuuyG9UpQbmc8YBKHEQGnytI9GkCq';
BEGIN
  SELECT id INTO org_id FROM "Organization" LIMIT 1;
  IF org_id IS NULL THEN 
    RAISE EXCEPTION 'No organization found. Run: pnpm db:seed';
  END IF;
  
  SELECT id INTO user_id FROM "User" WHERE email = 'leah2maria@gmail.com';
  
  IF user_id IS NULL THEN
    INSERT INTO "User" (id, "orgId", role, name, email, "passwordHash", active, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::TEXT,
      org_id,
      'owner',
      'Business Owner',
      'leah2maria@gmail.com',
      password_hash,
      true,
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ User created';
  ELSE
    UPDATE "User" 
    SET "passwordHash" = password_hash, "updatedAt" = NOW()
    WHERE email = 'leah2maria@gmail.com';
    RAISE NOTICE '✅ Password updated';
  END IF;
END $$;
EOF
```

### Step 7: Check NextAuth Configuration

**Verify NEXTAUTH_SECRET is set** (must be at least 32 characters):
```bash
# In Web service shell
echo $NEXTAUTH_SECRET | wc -c  # Should be > 32
```

### Step 8: Test Login with Debug Logging

**Add temporary logging to auth.ts** (lines 80-88):
```typescript
async authorize(credentials) {
  console.log('[NextAuth] Login attempt:', credentials.email);
  console.log('[NextAuth] DATABASE_URL set:', !!process.env.DATABASE_URL);
  
  if (!credentials?.email || !credentials?.password) {
    console.log('[NextAuth] Missing credentials');
    return null;
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: credentials.email as string },
      select: { id: true, email: true, name: true, passwordHash: true, sitterId: true },
    });
    console.log('[NextAuth] User found:', !!user);
  } catch (error) {
    console.error('[NextAuth] Database error:', error);
    return null;
  }

  if (!user) {
    console.log('[NextAuth] User not found');
    return null;
  }

  if (user.passwordHash) {
    const isValid = await bcrypt.compare(
      credentials.password as string,
      user.passwordHash
    );
    console.log('[NextAuth] Password valid:', isValid);
    if (!isValid) {
      return null;
    }
  } else {
    console.log('[NextAuth] No password hash');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    sitterId: user.sitterId,
  };
}
```

**Check logs after login attempt** to see exactly where it fails.

---

## Quick Fix Checklist

- [ ] DATABASE_URL set on Web service
- [ ] NEXTAUTH_SECRET set on Web service (32+ chars)
- [ ] User exists in database
- [ ] Password hash is correct (starts with `$2b$10$`)
- [ ] Web service can connect to database (test with /api/test-db)
- [ ] No Prisma errors in logs
- [ ] NextAuth logs show user found and password valid
