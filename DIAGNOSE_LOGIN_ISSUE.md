# Diagnose Login Issue

## Step 1: Verify DATABASE_URL on Web Service

**CRITICAL**: The Web service MUST have `DATABASE_URL` set for NextAuth to work.

1. Go to: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/environment
2. Check if `DATABASE_URL` exists
3. If missing, add:
   ```
   DATABASE_URL=postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
   ```
4. Save (triggers redeploy)

## Step 2: Verify User Exists in Database

Run this in **Render API service shell**:

```bash
cd /opt/render/project/src/enterprise-messaging-dashboard/apps/api
psql $DATABASE_URL -c "SELECT email, role, active, \"passwordHash\" IS NOT NULL as has_password FROM \"User\" WHERE email = 'leah2maria@gmail.com';"
```

**Expected output**: Should show one row with `has_password = true`

**If no rows**: User doesn't exist. Run the fix script below.

## Step 3: Fix User Password (if needed)

Run this in **Render API service shell**:

```bash
cd /opt/render/project/src/enterprise-messaging-dashboard/apps/api
psql $DATABASE_URL << 'EOF'
DO $$
DECLARE
  org_id TEXT;
  user_id TEXT;
  password_hash TEXT := '$2b$10$shlVzw6CFY87F2WZV/ieruwuNuuyG9UpQbmc8YBKHEQGnytI9GkCq';
BEGIN
  SELECT id INTO org_id FROM "Organization" LIMIT 1;
  IF org_id IS NULL THEN RAISE EXCEPTION 'No organization found. Run: pnpm db:seed'; END IF;
  SELECT id INTO user_id FROM "User" WHERE email = 'leah2maria@gmail.com';
  IF user_id IS NULL THEN
    INSERT INTO "User" (id, "orgId", role, name, email, "passwordHash", active, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::TEXT, org_id, 'owner', 'Business Owner', 'leah2maria@gmail.com', password_hash, true, NOW(), NOW());
    RAISE NOTICE '✅ User created';
  ELSE
    UPDATE "User" SET "passwordHash" = password_hash WHERE email = 'leah2maria@gmail.com';
    RAISE NOTICE '✅ Password updated';
  END IF;
END $$;
EOF
```

## Step 4: Check Web Service Logs

After ensuring DATABASE_URL is set and user exists:

1. Go to: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/logs
2. Try logging in
3. Look for errors like:
   - `[NextAuth] Database error during authorize`
   - `Cannot connect to database`
   - `PrismaClientInitializationError`

## Step 5: Test Login

- URL: https://snout-os-web.onrender.com/login
- Email: `leah2maria@gmail.com`
- Password: `Saint214!`

## Common Issues

### Issue: "invalid email or password"
**Causes:**
1. ❌ `DATABASE_URL` not set on Web service (most common)
2. ❌ User doesn't exist in database
3. ❌ Password hash mismatch (shouldn't happen if using the SQL above)
4. ❌ Database connection error (check logs)

**Fix:**
1. Add `DATABASE_URL` to Web service environment variables
2. Run the SQL fix script above
3. Wait for Web service to redeploy
4. Try login again
