# Add DATABASE_URL to .env.local

## Your DATABASE_URL

Based on your Supabase connection, add this line to your `.env.local` file:

```
DATABASE_URL="postgresql://postgres.ktmarxugcepkgwgsgifx:8nZbs23H6wMWiscM@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

## How to add it

### Option 1: Using terminal (nano editor)
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
nano .env.local
```

Then:
1. Press `Ctrl + O` to save
2. Press `Enter` to confirm
3. Press `Ctrl + X` to exit

### Option 2: Using terminal (echo command)
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
echo 'DATABASE_URL="postgresql://postgres.ktmarxugcepkgwgsgifx:8nZbs23H6wMWiscM@aws-0-us-west-1.pooler.supabase.com:6543/postgres"' >> .env.local
```

### Option 3: Using a text editor
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
open .env.local
```

Then paste this line:
```
DATABASE_URL="postgresql://postgres.ktmarxugcepkgwgsgifx:8nZbs23H6wMWiscM@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

## After adding it

1. Save the file
2. Test the connection:
   ```bash
   npm run db:studio
   ```
3. If that works, run the backfill:
   ```bash
   npm run backfill:tiers
   ```

## Alternative connection string (if pooler doesn't work)

If the pooler URL doesn't work, try the direct connection:

```
DATABASE_URL="postgresql://postgres:8nZbs23H6wMWiscM@db.ktmarxugcepkgwgsgifx.supabase.co:5432/postgres"
```
