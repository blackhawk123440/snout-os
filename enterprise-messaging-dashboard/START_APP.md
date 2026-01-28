# 🚀 Start the App - Step by Step

Follow these steps to get the app running locally and see all pages.

## Step 1: Check Prerequisites

Make sure you have:
- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Docker running (for local Postgres/Redis, or use Render services)

## Step 2: Install Dependencies

```bash
cd enterprise-messaging-dashboard
pnpm install
```

## Step 3: Build Shared Package

```bash
cd packages/shared
pnpm build
cd ../..
```

## Step 4: Configure Environment

### API Configuration (`apps/api/.env`)

Make sure you have:
```env
DATABASE_URL="your-render-db-url"
REDIS_URL="your-redis-url"
PROVIDER_MODE="mock"  # or "twilio"
JWT_SECRET="any-secret-key"
CORS_ORIGINS="http://localhost:3000"
PORT=3001
```

### Web Configuration (`apps/web/.env.local`)

Make sure you have:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXTAUTH_SECRET="any-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Step 5: Generate Prisma Client

```bash
cd apps/api
pnpm prisma generate
cd ../..
```

## Step 6: Start the Servers

### Option A: Start Both Together (Recommended)

```bash
cd enterprise-messaging-dashboard
pnpm dev
```

This starts:
- API on http://localhost:3001
- Web on http://localhost:3000

### Option B: Start Separately

**Terminal 1 - API:**
```bash
cd enterprise-messaging-dashboard/apps/api
pnpm dev
```

**Terminal 2 - Web:**
```bash
cd enterprise-messaging-dashboard/apps/web
pnpm dev
```

## Step 7: Access the App

1. **Open browser**: http://localhost:3000
2. **Login page**: http://localhost:3000/login
3. **Use demo credentials**:
   - Email: `owner@example.com`
   - Password: `password123`

## Step 8: View All Pages

See `ALL_PAGES.md` for a complete list of all available pages.

### Quick Links:
- Login: http://localhost:3000/login
- Dashboard: http://localhost:3000/dashboard
- Inbox: http://localhost:3000/inbox
- Numbers: http://localhost:3000/numbers
- Routing: http://localhost:3000/routing
- Assignments: http://localhost:3000/assignments
- Automations: http://localhost:3000/automations
- Alerts: http://localhost:3000/alerts
- Audit: http://localhost:3000/audit
- Ops: http://localhost:3000/ops
- Settings: http://localhost:3000/settings
- Sitter Inbox: http://localhost:3000/sitter/inbox

## Troubleshooting

### "Cannot connect to database"
- Check your `DATABASE_URL` in `apps/api/.env`
- Make sure Render database allows external connections
- Try adding `?sslmode=require` to the URL

### "Redis connection failed"
- Check your `REDIS_URL` in `apps/api/.env`
- Make sure Redis is accessible

### "Port already in use"
```bash
# Find what's using the port
lsof -i :3000
lsof -i :3001

# Kill the process or change ports in .env files
```

### "Module not found"
```bash
# Rebuild shared package
cd packages/shared
pnpm build

# Reinstall dependencies
cd ../..
pnpm install
```

### "Prisma Client not generated"
```bash
cd apps/api
pnpm prisma generate
```

### App won't start
1. Check terminal for error messages
2. Verify all environment variables are set
3. Make sure dependencies are installed: `pnpm install`
4. Make sure shared package is built: `cd packages/shared && pnpm build`

## Next Steps

Once the app is running:
1. Login at http://localhost:3000/login
2. Complete setup wizard if prompted
3. Explore all pages listed in `ALL_PAGES.md`
