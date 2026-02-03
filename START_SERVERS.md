# How to Start Servers

## Quick Start

Run these commands in separate terminal windows:

### Terminal 1: Start Docker (PostgreSQL + Redis)
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
docker compose -f enterprise-messaging-dashboard/docker-compose.yml up -d
```

### Terminal 2: Start Development Server
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
pnpm dev
```

## Verify Everything is Running

### Check Docker containers:
```bash
docker compose -f enterprise-messaging-dashboard/docker-compose.yml ps
```

You should see:
- `snoutos-postgres` - Running (healthy)
- `snoutos-redis` - Running (healthy)

### Check dev server:
```bash
curl http://localhost:3000
```

Or open in browser: http://localhost:3000

## Stop Servers

### Stop Docker:
```bash
docker compose -f enterprise-messaging-dashboard/docker-compose.yml down
```

### Stop dev server:
Press `Ctrl+C` in the terminal running `pnpm dev`

## All-in-One Script

You can also use the pilot-smoke script which starts everything:
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
pnpm pilot:smoke
```

This will:
1. Start Docker containers
2. Run migrations
3. Seed database
4. Start dev server
5. Run smoke tests
