# Check URLs Without jq

## Quick Check Commands (No jq Required)

### Check NEXTAUTH_URL for trailing newline:
```bash
curl -s https://snout-os-staging.onrender.com/api/auth/health | python3 -c "import sys, json; data=json.load(sys.stdin); url = data['env']['NEXTAUTH_URL_RAW']; print('URL:', repr(url)); print('Has newline:', '\n' in url or '\r' in url)"
```

### Check all environment variables:
```bash
curl -s https://snout-os-staging.onrender.com/api/auth/health | python3 -c "import sys, json; data=json.load(sys.stdin); env = data['env']; print('NEXTAUTH_URL_RAW:', repr(env.get('NEXTAUTH_URL_RAW', 'NOT SET'))); print('NEXT_PUBLIC_API_URL:', env.get('NEXT_PUBLIC_API_URL', 'NOT SET'))"
```

### Simple grep check:
```bash
curl -s https://snout-os-staging.onrender.com/api/auth/health | grep -o '"NEXTAUTH_URL_RAW":"[^"]*"'
```

If you see `\n` in the output, there's a trailing newline.

## What to Look For

**Good** (no newline):
```
"NEXTAUTH_URL_RAW":"https://snout-os-staging.onrender.com"
```

**Bad** (has newline):
```
"NEXTAUTH_URL_RAW":"https://snout-os-staging.onrender.com\n"
```

## Fix in Render

1. Go to: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/env
2. Edit `NEXTAUTH_URL`
3. Delete value completely
4. Type fresh: `https://snout-os-staging.onrender.com`
5. Save
