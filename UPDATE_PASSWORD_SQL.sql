-- Update password for leah2maria@gmail.com
-- Run this in Render API service shell: psql $DATABASE_URL < UPDATE_PASSWORD_SQL.sql
-- Or copy/paste the DO block below

DO $$
DECLARE
  org_id TEXT;
  user_id TEXT;
  password_hash TEXT := '$2b$10$2cpsFLf1xqD0Tfa8EAMOReSJd4vzZ2ZxmTbAa/yQaDSb2aPFN82x.';
BEGIN
  -- Get first organization
  SELECT id INTO org_id FROM "Organization" LIMIT 1;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Run seed script first: pnpm db:seed';
  END IF;
  
  -- Check if user exists
  SELECT id INTO user_id FROM "User" WHERE email = 'leah2maria@gmail.com';
  
  IF user_id IS NULL THEN
    -- Create user
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
    RAISE NOTICE '✅ User created: leah2maria@gmail.com';
  ELSE
    -- Update password
    UPDATE "User" SET "passwordHash" = password_hash WHERE email = 'leah2maria@gmail.com';
    RAISE NOTICE '✅ User password updated: leah2maria@gmail.com';
  END IF;
END $$;

-- Verify the update
SELECT email, "passwordHash" IS NOT NULL as has_password, role, active FROM "User" WHERE email = 'leah2maria@gmail.com';
