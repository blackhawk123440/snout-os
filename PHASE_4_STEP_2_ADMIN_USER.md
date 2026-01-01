# Phase 4 Step 2: Create/Verify Admin User

**Master Spec Reference**: Line 267
"Create admin user"

**Prerequisites**: 
- Database migrations must be applied
- User table must exist in database

---

## Step 2A: Verify Admin User Exists

**Method 1: Check via Prisma Studio**
```bash
npm run db:studio
```
- Navigate to User table
- Check if any users exist
- Verify if admin user exists

**Method 2: Check via Script**
Create a simple check script or use the create script with upsert (it will update if exists).

---

## Step 2B: Create Admin User

### Option 1: Use Provided Script (Recommended)

The script uses `upsert`, so it's safe to run multiple times (creates if not exists, updates if exists).

```bash
# From project root
npx tsx scripts/create-admin-user.ts <email> <password> [name]

# Example:
npx tsx scripts/create-admin-user.ts admin@snoutservices.com YourSecurePassword123! "Admin User"
```

**What the script does**:
- Hashes password using bcrypt (cost 10)
- Creates or updates user in database
- Sets `emailVerified` to current date
- Uses upsert (safe to run multiple times)

**Requirements**:
- Email: Valid email address (will be used as login)
- Password: Strong password (recommended: at least 12 characters)
- Name: Optional display name (defaults to "Admin User")

### Option 2: Create via SQL (Alternative)

If you have direct database access, you can create the user via SQL:

```sql
-- First, generate a bcrypt hash of your password
-- Use an online tool or the script to generate this
-- Example hash (for password "YourPassword123!"):
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

INSERT INTO "User" (id, email, name, "passwordHash", "emailVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@snoutservices.com',
  'Admin User',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Replace with your hash
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

### Option 3: Create via NextAuth Credentials Provider

The admin user can also be created through the login flow if the credentials provider supports user creation, but the script method is recommended for initial setup.

---

## Verification

After creating the admin user, verify:

1. **Database Check**:
   ```bash
   npm run db:studio
   ```
   - Open User table
   - Verify user exists with correct email
   - Verify `passwordHash` field is populated (not null)
   - Verify `emailVerified` is set

2. **Login Test** (after enabling auth):
   - Navigate to `/login`
   - Enter admin email and password
   - Verify login succeeds
   - Verify redirect to dashboard works

---

## Security Notes

- **Password Storage**: Passwords are hashed using bcrypt (cost 10)
- **Email Verification**: `emailVerified` is set to current date on creation
- **Unique Email**: Email must be unique (enforced by database)
- **Password Requirements**: No enforced requirements in schema, but use strong passwords in practice

---

## Troubleshooting

**Error: "User table does not exist"**
- Run database migrations: `npm run db:push` or `npx prisma migrate deploy`

**Error: "Password hash invalid"**
- Ensure bcrypt is installed: `npm install bcryptjs`
- Verify password hash format matches bcrypt format

**Error: "Email already exists"**
- The script uses upsert, so this shouldn't happen
- If using SQL directly, use `ON CONFLICT DO UPDATE` clause

**Login fails after creation**:
- Verify password hash is correct
- Check that NextAuth is configured correctly
- Verify `NEXTAUTH_SECRET` is set in environment
- Check server logs for authentication errors

---

## Next Step

After admin user is created and verified, proceed to **Step 3: Enable Auth Flag in Staging**.

See `PHASE_4_EXECUTION_PLAN.md` for complete Phase 4 process.

