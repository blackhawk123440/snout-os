# Git Push Authentication Fix

## Current Issue
- HTTPS push: 403 Permission denied
- SSH push: Permission denied (publickey)

## Solution: Use GitHub Personal Access Token

### Step 1: Create Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: "Snout OS Deployment"
4. Expiration: 90 days (or your preference)
5. Scopes: Check `repo` (full control of private repositories)
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again)

### Step 2: Push Using Token
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
git push origin main
```

When prompted:
- **Username:** `blackhawk123440`
- **Password:** `<paste your personal access token here>`

### Step 3: Save Credentials (Optional)
To avoid entering token every time:
```bash
git config --global credential.helper osxkeychain
# Then push again - macOS will save the token
```

## Alternative: Set Up SSH Key

If you prefer SSH:

### Step 1: Generate SSH Key (if you don't have one)
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Optionally set a passphrase
```

### Step 2: Add SSH Key to GitHub
```bash
# Copy your public key
cat ~/.ssh/id_ed25519.pub
# Copy the output
```

1. Go to: https://github.com/settings/keys
2. Click "New SSH key"
3. Paste your public key
4. Click "Add SSH key"

### Step 3: Test and Push
```bash
ssh -T git@github.com
# Should say: "Hi blackhawk123440! You've successfully authenticated..."

cd "/Users/leahhudson/Desktop/final form/snout-os"
git remote set-url origin git@github.com:blackhawk123440/snout-os.git
git push origin main
```

## Quick Fix (Recommended)
**Use Personal Access Token with HTTPS** - it's the fastest solution.
