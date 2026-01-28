# Setup Steps (Copy-Paste Ready)

Copy and paste these commands one at a time into your terminal.

## Step 1: Install pnpm (if not installed)

```bash
npm install -g pnpm
```

## Step 2: Navigate to project

```bash
cd enterprise-messaging-dashboard
```

## Step 3: Install dependencies

```bash
pnpm install
```

## Step 4: Start Docker services

Try this first (newer Docker):
```bash
docker compose up -d
```

If that doesn't work, try (older Docker):
```bash
docker-compose up -d
```

## Step 5: Setup database

```bash
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev
pnpm db:seed
```

## Step 6: Start servers

```bash
cd ../..
pnpm dev
```

## Or use the quick start script:

```bash
./QUICK_START.sh
```

## Troubleshooting

### "pnpm: command not found"
```bash
npm install -g pnpm
```

### "docker: command not found"
Install Docker Desktop: https://www.docker.com/products/docker-desktop

### "docker-compose: command not found"
Try `docker compose` (without hyphen) - newer Docker versions use this.

### Port already in use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001

# Kill the process or change ports in .env files
```

### Database connection error
```bash
# Check if Docker is running
docker ps

# Restart Docker services
docker compose restart
# or
docker-compose restart
```
