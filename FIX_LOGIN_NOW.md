# 🔴 URGENT: Fix Login Issue

## The Problem
Login fails with "invalid email or password" because the **Web service cannot access the database**.

## The Fix (2 steps)

### Step 1: Add DATABASE_URL to Web Service ⚠️ CRITICAL

1. **Go to**: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/environment
2. **Click**: "Add Environment Variable"
3. **Name**: `DATABASE_URL`
4. **Value**: 
   ```
   postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging
   ```
5. **Click**: "Save Changes" (triggers redeploy)

### Step 2: Verify User Exists (Run in API Shell)

1. **Open Render API service shell**: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/shell
2. **Run**:
   ```bash
   cd /opt/render/project/src/enterprise-messaging-dashboard/apps/api
   psql $DATABASE_URL -c "SELECT email, role, active FROM \"User\" WHERE email = 'leah2maria@gmail.com';"
   ```
3. **If no user found**, run:
   ```bash
   psql $DATABASE_URL << 'EOF'
   DO $$
   DECLARE
     org_id TEXT;
     password_hash TEXT := '$2b$10$shlVzw6CFY87F2WZV/ieruwuNuuyG9UpQbmc8YBKHEQGnytI9GkCq';
   BEGIN
     SELECT id INTO org_id FROM "Organization" LIMIT 1;
     IF org_id IS NULL THEN RAISE EXCEPTION 'No org found'; END IF;
     INSERT INTO "User" (id, "orgId", role, name, email, "passwordHash", active, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::TEXT, org_id, 'owner', 'Owner', 'leah2maria@gmail.com', password_hash, true, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET "passwordHash" = password_hash;
   END $$;
   EOF
   ```

### Step 3: Wait for Redeploy

- Wait 2-3 minutes for Web service to redeploy after adding `DATABASE_URL`
- Check logs: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/logs

### Step 4: Test Login

- URL: https://snout-os-web.onrender.com/login
- Email: `leah2maria@gmail.com`
- Password: `Saint214!`

---

## Why This Happens

NextAuth.js needs direct database access to verify passwords. Without `DATABASE_URL`, the Web service cannot query the `User` table, so login always fails.
