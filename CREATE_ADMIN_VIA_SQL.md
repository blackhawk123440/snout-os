# Create Admin User via SQL (Alternative Method)

Since we have MCP access to Supabase, we can create the admin user directly via SQL instead of using the script.

## After Prisma Migrations Complete

Once `npx prisma db push` succeeds, we can create the admin user directly using SQL:

```sql
-- Generate password hash (using bcrypt with cost 10)
-- We'll need to hash the password first, then insert

-- Insert admin user
INSERT INTO "User" (id, email, name, "passwordHash", "emailVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@snoutservices.com',
  'Admin User',
  '$2a$10$...', -- bcrypt hash of YourPassword123!
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET 
  "passwordHash" = EXCLUDED."passwordHash",
  name = EXCLUDED.name,
  "updatedAt" = NOW();
```

## Or Use the Script (Recommended)

The script handles password hashing automatically:
```bash
npx tsx scripts/create-admin-user.ts admin@snoutservices.com YourPassword123! "Admin User"
```

## Current Status

- ✅ MCP connection to Supabase works
- ⏳ Waiting for Prisma migrations to complete
- ✅ Can create admin user once tables exist

