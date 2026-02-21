# Messaging Dashboard Setup (Connect Provider, Webhooks, Readiness)

This app uses the **enterprise-messaging-dashboard** Prisma schema. For **Connect Provider** and webhook/readiness to work, do the following.

## 1. Run the ProviderCredential migration

The dashboard saves Twilio credentials in the `ProviderCredential` table. Ensure that table exists in the **same database** the Next.js app uses (`DATABASE_URL`).

From the repo root:

```bash
cd enterprise-messaging-dashboard/apps/api
npx prisma migrate deploy
```

Or apply the migration manually (e.g. with `psql $DATABASE_URL -f prisma/migrations/20260220000000_add_provider_credential/migration.sql`).

## 2. Set ENCRYPTION_KEY for the Next.js app

Connect encrypts credentials before saving. If `ENCRYPTION_KEY` is not set (and you're not in development), encryption will fail and Connect will return an error.

- **Local:** Add to `.env` or `.env.local`:
  ```
  ENCRYPTION_KEY=your-base64-or-hex-key-at-least-32-bytes
  ```
  Generate one with: `openssl rand -base64 32`
- **Production:** Set the `ENCRYPTION_KEY` environment variable for the Next.js (Web) service.

## 3. Same database for Connect and Status

Connect and provider status both use the app’s Prisma client and `DATABASE_URL`. Ensure the Next.js app’s `DATABASE_URL` points to the database where you ran the migration. If you use a separate DB for the NestJS API, the dashboard does **not** use it for Connect anymore; it only uses its own DB.

## Quick check

1. Run the migration (step 1).
2. Set `ENCRYPTION_KEY` (step 2).
3. In the dashboard, open Setup → Twilio: enter Account SID and Auth Token → Save.
4. The UI should show **Connected** and, after installing webhooks, **Ready** in one place (no more “Ready” in one spot and “Not Ready” or “Error checking webhooks” in another).

## "Twilio rejected the credentials" / "Authenticate" when installing webhooks

If Connect shows **Connected** but **Install Webhooks** fails with an authentication error:

- **Re-enter credentials**: In Connect Provider, paste Account SID and Auth Token again (no leading/trailing spaces; Auth Token is the secret, not the SID).
- **Same account**: Use the same Twilio account that owns the phone numbers you want to configure.
- **Regenerate token**: In Twilio Console → Account → API keys & tokens, create a new Auth Token if the current one was rotated or revoked, then update in the dashboard and try again.
