# Fix Git Authentication Error

## Problem
```
remote: Permission to blackhawk123440/snout-os.git denied to blackhawk123440.
fatal: unable to access 'https://github.com/blackhawk123440/snout-os.git/': The requested URL returned error: 403
```

This means GitHub is rejecting the authentication. Common causes:
1. Using HTTPS with expired/invalid credentials
2. Two-factor authentication requires a Personal Access Token (not password)
3. SSH key not set up

## Solutions

### Option 1: Use SSH (Recommended)

If you have SSH keys set up with GitHub:

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
git remote set-url origin git@github.com:blackhawk123440/snout-os.git
git push origin main
```

### Option 2: Use Personal Access Token (HTTPS)

If you're using HTTPS, you need a Personal Access Token instead of a password:

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: "snout-os-push"
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token** (you won't see it again!)

2. **Update git remote to use token:**
   ```bash
   cd "/Users/leahhudson/Desktop/final form/snout-os"
   git remote set-url origin https://YOUR_TOKEN@github.com/blackhawk123440/snout-os.git
   git push origin main
   ```
   Replace `YOUR_TOKEN` with the token you just created.

3. **Or use credential helper (safer):**
   ```bash
   git push origin main
   # When prompted:
   # Username: blackhawk123440
   # Password: <paste your Personal Access Token>
   ```

### Option 3: Use GitHub CLI

If you have GitHub CLI installed:

```bash
gh auth login
git push origin main
```

### Option 4: Update Git Credentials in Keychain (macOS)

If credentials are stored in macOS Keychain:

1. Open **Keychain Access** app
2. Search for "github.com"
3. Delete old credentials
4. Try pushing again - macOS will prompt for new credentials

## Quick Test

After fixing authentication, test with:
```bash
git push origin main
```

## Current Status

- ✅ Fix committed locally (commit `f0188bd`)
- ❌ Push blocked by authentication
- ⏳ Waiting for authentication fix

Once you push, Render will automatically deploy the fix and the build should succeed.
