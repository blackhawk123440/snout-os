# How to Fix NEXTAUTH_URL in Render (Step-by-Step)

## The Problem
Even though you don't see a newline in Render's UI, the value still has one. This is a common Render issue where:
- Copy/paste can add invisible characters
- The UI doesn't show trailing whitespace
- The value gets saved with hidden characters

## The Solution: Complete Delete & Retype

### Step 1: Go to Render Environment Variables
1. Open: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/env
2. Find `NEXTAUTH_URL` in the list

### Step 2: Delete the Variable Completely
1. Click the **trash can icon** (🗑️) next to `NEXTAUTH_URL`
2. Confirm deletion
3. **Wait for it to disappear from the list**

### Step 3: Add It Fresh (No Copy/Paste)
1. Click **"+ New"** button
2. **Key:** Type exactly: `NEXTAUTH_URL` (no spaces)
3. **Value:** Type exactly (character by character, don't paste):
   ```
   https://snout-os-staging.onrender.com
   ```
   - Start with `h`
   - Type each character manually
   - **Do NOT copy/paste from anywhere**
   - **Do NOT press Enter at the end**
   - Just type the URL and stop

### Step 4: Save
1. Click **"Save Changes"** at the bottom
2. Wait for redeploy (3-5 minutes)

## Alternative: Use Render API (If You Have Access)

If you have Render API access, you can set it programmatically:

```bash
# This ensures no hidden characters
curl -X PATCH "https://api.render.com/v1/services/srv-d5abmh3uibrs73boq1kg/env-vars" \
  -H "Authorization: Bearer YOUR_RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "envVar": {
      "key": "NEXTAUTH_URL",
      "value": "https://snout-os-staging.onrender.com"
    }
  }'
```

## Verify After Fix

After redeploy, check:
```bash
curl -s https://snout-os-staging.onrender.com/api/auth/health | python3 -c "import sys, json; d=json.load(sys.stdin); url = d['env']['NEXTAUTH_URL_RAW']; print('Length:', len(url), '(should be 37)'); print('Has newline:', '\\n' in url or '\\r' in url); print('Value:', repr(url))"
```

Should show:
- Length: 37
- Has newline: False
- Value: 'https://snout-os-staging.onrender.com'

## Why This Happens

Render's environment variable editor:
- Doesn't show trailing whitespace visually
- Can preserve hidden characters from copy/paste
- May add newlines when saving multi-line values
- The UI shows the value "clean" but stores it with extra bytes

The code-level trim fix I added will handle it, but it's better to fix it at the source.
