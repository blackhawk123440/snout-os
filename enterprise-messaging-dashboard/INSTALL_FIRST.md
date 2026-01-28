# ⚠️ Install Prerequisites First

Before running the setup, you need to install these tools:

## 1. Install pnpm

**Option A: Using npm (requires sudo)**
```bash
sudo npm install -g pnpm
```

**Option B: Using Homebrew (recommended for Mac)**
```bash
brew install pnpm
```

**Option C: Using Corepack (if you have Node.js 16.10+)**
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

**Verify installation:**
```bash
pnpm --version
```

## 2. Install Docker Desktop

1. **Download Docker Desktop for Mac:**
   - Go to: https://www.docker.com/products/docker-desktop
   - Download and install Docker Desktop
   - Open Docker Desktop and wait for it to start

2. **Verify installation:**
   ```bash
   docker --version
   docker compose version
   ```

## 3. Once Both Are Installed

Then you can run the setup:

```bash
cd enterprise-messaging-dashboard
pnpm install
docker compose up -d
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev
pnpm db:seed
cd ../..
pnpm dev
```

## Quick Install Script (Mac with Homebrew)

If you have Homebrew installed:

```bash
# Install pnpm
brew install pnpm

# Install Docker Desktop (via Homebrew Cask)
brew install --cask docker

# Open Docker Desktop
open -a Docker

# Wait for Docker to start, then continue with setup
```

## Alternative: Use npm instead of pnpm

If you can't install pnpm, you can use npm (but pnpm is recommended for monorepos):

```bash
# Install dependencies
npm install

# Setup database
cd apps/api
npx prisma generate
npx prisma migrate dev
npm run db:seed

# Start servers (you'll need to run these in separate terminals)
cd ../..
cd apps/api && npm run dev &
cd ../web && npm run dev &
```

## Need Help?

- **pnpm docs**: https://pnpm.io/installation
- **Docker Desktop**: https://docs.docker.com/desktop/install/mac-install/
