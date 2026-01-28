# ✅ pnpm is Installed! Next Steps

Great! You have pnpm version 10.28.2 installed.

## Now Run These Commands

Copy and paste these **one at a time**:

### 1. Install project dependencies
```bash
pnpm install
```

### 2. Check if Docker is installed
```bash
docker --version
```

If Docker is **not** installed:
- Download Docker Desktop: https://www.docker.com/products/docker-desktop
- Install and open it
- Wait for Docker to start (whale icon in menu bar)

### 3. Start Docker services (Postgres + Redis)
```bash
docker compose up -d
```

If that doesn't work, try:
```bash
docker-compose up -d
```

### 4. Setup database
```bash
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev
pnpm db:seed
```

### 5. Go back to root and start servers
```bash
cd ../..
pnpm dev
```

## What Happens Next?

After running `pnpm dev`, you'll see:
- API server starting on port 3001
- Web server starting on port 3000

Then open your browser to:
- **http://localhost:3000** - See the dashboard!

## Demo Login

- Email: `owner@example.com`
- Password: `password123`

## If Docker is Not Installed

You can still view the code files:
- Messages page: `apps/web/src/app/inbox/page.tsx`
- Dashboard: `apps/web/src/app/dashboard/page.tsx`
- Auth: `apps/web/src/lib/auth.tsx`

But you won't be able to run it without Docker (needed for database).
