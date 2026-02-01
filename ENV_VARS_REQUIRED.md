# Required Environment Variables

## Web Service (Next.js)

### Authentication (Required)
- `NEXTAUTH_URL` - Full URL of the web service (e.g., `https://snout-os-staging.onrender.com`)
- `NEXTAUTH_SECRET` - Random string, minimum 32 characters (64+ recommended for production)

### Messaging Feature Flag (Required for messaging features)
- `NEXT_PUBLIC_ENABLE_MESSAGING_V1` - Set to `true` to enable messaging UI

### API Configuration (Required if using separate API service)
- `NEXT_PUBLIC_API_URL` - Full URL of the API service (e.g., `https://snout-os-api-staging.onrender.com`)
  - If API and Web are same service, use same URL as `NEXTAUTH_URL`

### Encryption (Required for credential persistence)
- `ENCRYPTION_KEY` - 32-byte key for AES-256-GCM encryption (hex-encoded 64 chars, or any string that will be derived to 32 bytes)
  - Example: `openssl rand -hex 32` (generates 64-char hex string)
  - Or: Any string (will be derived using scrypt)

### Build Metadata (Optional, for deployment proof)
- `NEXT_PUBLIC_GIT_SHA` - Git commit SHA (set by CI/CD)
- `NEXT_PUBLIC_BUILD_TIME` - ISO timestamp of build (set by CI/CD)

### Database (NOT required for Web service)
- Web service does NOT need `DATABASE_URL` (NextAuth uses JWT, not database adapter)

---

## API Service (NestJS - if separate)

### Database (Required)
- `DATABASE_URL` - PostgreSQL connection string

### Redis (Required for BullMQ)
- `REDIS_URL` - Redis connection string

### Authentication (Required)
- `JWT_SECRET` - Secret for JWT token signing (separate from NextAuth)

### Encryption (Required)
- `ENCRYPTION_KEY` - Same as Web service (must match for credential decryption)

### Messaging Feature Flag (Required)
- `ENABLE_MESSAGING_V1` - Set to `true` to enable messaging endpoints

### Twilio (Optional - can be set via UI)
- `TWILIO_ACCOUNT_SID` - Twilio Account SID (fallback if not set in DB)
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token (fallback if not set in DB)
- `TWILIO_WEBHOOK_AUTH_TOKEN` - For webhook signature verification
- `TWILIO_WEBHOOK_URL` - Webhook URL (auto-constructed if not set)
- `WEBHOOK_BASE_URL` - Base URL for webhook construction

### Other (As needed)
- `PROVIDER_MODE` - `twilio` or `mock`
- `ALLOW_DEV_SEED` - Set to `true` to enable dev seeding endpoint

---

## Local Development (.env.local)

```bash
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key-change-in-production-min-32-chars

# Messaging
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=http://localhost:3000

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-64-char-hex-key-here

# Database (if using local DB)
DATABASE_URL=postgresql://user:password@localhost:5432/snout_os_db

# Redis (if using local Redis)
REDIS_URL=redis://localhost:6379

# Twilio (optional - can be set via UI)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WEBHOOK_AUTH_TOKEN=your_webhook_auth_token_here
```

---

## Staging (Render)

### Web Service Environment Variables:
```
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=<64+ char random string>
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snout-os-api-staging.onrender.com
ENCRYPTION_KEY=<64 char hex string from: openssl rand -hex 32>
NEXT_PUBLIC_GIT_SHA=<set by CI/CD>
NEXT_PUBLIC_BUILD_TIME=<set by CI/CD>
```

### API Service Environment Variables:
```
DATABASE_URL=<PostgreSQL connection string>
REDIS_URL=<Redis connection string>
JWT_SECRET=<random string>
ENCRYPTION_KEY=<same as Web service>
ENABLE_MESSAGING_V1=true
TWILIO_ACCOUNT_SID=<optional fallback>
TWILIO_AUTH_TOKEN=<optional fallback>
TWILIO_WEBHOOK_AUTH_TOKEN=<required for webhook verification>
WEBHOOK_BASE_URL=https://snout-os-staging.onrender.com
```

---

## Notes

1. **ENCRYPTION_KEY must match** between Web and API services if they're separate
2. **NEXTAUTH_SECRET** must be >= 32 characters (64+ recommended)
3. **ENCRYPTION_KEY** can be:
   - 64-character hex string (recommended): `openssl rand -hex 32`
   - Any string (will be derived to 32 bytes using scrypt)
4. **Twilio credentials** can be set via UI (`/setup`) OR environment variables (env vars are fallback)
5. **Web service does NOT need DATABASE_URL** - NextAuth uses JWT strategy, not database adapter
