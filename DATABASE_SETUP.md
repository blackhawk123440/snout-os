# Database Setup Required

## ⚠️ Error: DATABASE_URL Not Configured

You need to set up your database connection before creating an admin user.

## Quick Fix

### Option 1: If you already have a database

Edit your `.env` file (create it if it doesn't exist) and add:

```bash
DATABASE_URL="postgresql://username:password@host:5432/database_name"
```

**Example for local PostgreSQL:**
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/snout_os_db"
```

**Example for remote database (Render, Supabase, etc.):**
```bash
DATABASE_URL="postgresql://user:pass@host.provider.com:5432/dbname?sslmode=require"
```

### Option 2: Create a new local database

If you don't have a database yet:

1. **Install PostgreSQL** (if not already installed):
   - macOS: `brew install postgresql@14`
   - Or download from: https://www.postgresql.org/download/

2. **Start PostgreSQL:**
   ```bash
   brew services start postgresql@14
   ```

3. **Create database:**
   ```bash
   createdb snout_os_db
   ```

4. **Create `.env` file:**
   ```bash
   cd "/Users/leahhudson/Desktop/final form/snout-os"
   cp .env.example .env
   ```

5. **Edit `.env` and set:**
   ```bash
   DATABASE_URL="postgresql://$(whoami)@localhost:5432/snout_os_db"
   ```
   
   (Replace `$(whoami)` with your PostgreSQL username, usually your macOS username)

6. **Run database migrations:**
   ```bash
   npx prisma db push
   ```

7. **Now try creating admin user again:**
   ```bash
   npx tsx scripts/create-admin-user.ts admin@snoutservices.com YourPassword123! "Admin User"
   ```

---

## For Production/Remote Database

If you're using a hosted database (Render, Supabase, Neon, etc.):

1. Get your connection string from your database provider
2. It should look like: `postgresql://user:password@host:5432/dbname?sslmode=require`
3. Add it to `.env`:
   ```bash
   DATABASE_URL="your-connection-string-here"
   ```
4. Run migrations:
   ```bash
   npx prisma db push
   ```
5. Create admin user:
   ```bash
   npx tsx scripts/create-admin-user.ts admin@snoutservices.com YourPassword123! "Admin User"
   ```

---

## Verify Setup

After setting `DATABASE_URL`, test it:

```bash
# Test database connection
npx prisma db push

# If that works, create admin user
npx tsx scripts/create-admin-user.ts admin@snoutservices.com YourPassword123! "Admin User"
```

---

## Need Help?

- **Check if PostgreSQL is running:** `psql -l`
- **Check your connection string format:** Must start with `postgresql://` or `postgres://`
- **Check `.env` file exists:** `ls -la .env`
- **View current DATABASE_URL:** `grep DATABASE_URL .env`

