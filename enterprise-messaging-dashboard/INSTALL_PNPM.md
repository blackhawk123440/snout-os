# Install pnpm (Permission Error Fix)

You got a permission error. Here are **easier ways** to install pnpm:

## Option 1: Use Corepack (Easiest - No Installation Needed!)

If you have Node.js 16.10+, pnpm is already available via Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

**Check if it worked:**
```bash
pnpm --version
```

## Option 2: Use Homebrew (If You Have It)

```bash
brew install pnpm
```

## Option 3: Use npx (No Installation - Runs Directly)

You can use pnpm **without installing it** by using `npx`:

```bash
# Instead of: pnpm install
npx pnpm install

# Instead of: pnpm dev
npx pnpm dev

# Instead of: pnpm prisma generate
npx pnpm prisma generate
```

## Option 4: Use sudo (If Nothing Else Works)

```bash
sudo npm install -g pnpm
```

You'll be asked for your password.

## Recommended: Use Corepack

Try this first (it's built into Node.js):

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

If that works, you're all set! Continue with the setup.
