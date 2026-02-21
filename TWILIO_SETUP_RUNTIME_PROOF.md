# Twilio Setup Runtime Proof

This document defines how the Twilio Setup tab (`/messages?tab=setup`) behaves and how to verify it. Success is only shown when backend + DB + Twilio state are actually correct.

## Twilio object used

We configure and check **IncomingPhoneNumbers** (per-number `smsUrl`), **not** Messaging Service. All install and status logic uses `client.incomingPhoneNumbers.list()` and `client.incomingPhoneNumbers(sid).update({ smsUrl, smsMethod })`. If you need Messaging Service inbound URL instead, install/status would need to be implemented against the service SID and its inbound request URL.

## Exact network calls

| Action | Method | Endpoint | When |
|--------|--------|----------|------|
| Load provider status | GET | `/api/setup/provider/status` | On mount, after Connect |
| Load webhook status | GET | `/api/setup/webhooks/status` | On mount, after Install |
| Load readiness | GET | `/api/setup/readiness` | On mount, after Connect/Install |
| Save credentials | POST | `/api/setup/provider/connect` | Click "Save Credentials" in Connect modal |
| Install webhooks | POST | `/api/setup/webhooks/install` | Click "Install Webhooks" |
| Copy diagnostics | GET | `/api/ops/twilio-setup-diagnostics` | Click "Copy Setup Diagnostics" (owner, non-prod) |

After Connect: UI refetches `provider/status` and `readiness`. After Install: UI refetches `webhooks/status` and `readiness`.

## What the UI shows after each step

### After clicking Connect Provider (Save Credentials)

- **If verified:** Modal closes, alert "Provider connected and verified.", Provider card shows **Connected ✓**, "Last checked" timestamp updates. Readiness "Provider Connection" shows Ready.
- **If not verified:** Banner appears: "Connect reported success but verification failed. Use Copy Setup Diagnostics." Provider card stays **Not Connected** until status actually returns `connected: true`.
- **If error:** Alert with error message; no success state.

### After clicking Install Webhooks

- **If verified:** Alert "Webhooks installed and verified.", Webhooks card shows **Installed ✓**, "Last checked" updates. Readiness "Webhooks" shows Ready.
- **If 200 but not verified:** Banner: "Install reported success but verification failed. Use Copy Setup Diagnostics." Webhooks card stays **Not Installed** until `webhooks/status` returns `installed: true`.
- **If error:** Alert with error message.

### Readiness

- **Provider Ready** = `GET provider/status` returns `connected: true`.
- **Numbers Ready** = at least one active MessageNumber (front_desk) for org.
- **Webhooks Ready** = `GET webhooks/status` returns `installed: true`.
- **Overall Ready** = all three true. No "Ready" badges if provider card still says Not Connected.

## Backend response shapes

### GET /api/setup/provider/status

- `connected: boolean`
- `accountSid: string | null` (masked)
- `hasAuthToken?: boolean`
- `checkedAt?: string` (ISO)
- `verified?: boolean`
- `errorDetail?: string` (when error)

### GET /api/setup/webhooks/status

- `installed: boolean`
- `url: string | null`
- `status: 'installed' | 'not_installed' | 'error' | 'not_configured' | 'no_numbers'`
- `webhookTarget: 'incoming_phone_numbers'` — we use Twilio **IncomingPhoneNumbers** (per-number smsUrl), not Messaging Service
- `numbersFetchedCount: number` — total from `IncomingPhoneNumbers.list()`
- `accountSidMasked: string | null`
- `firstTwilioError: string | null` — first Twilio API error if any
- `checkedAt?: string`, `verified?: boolean`, `errorDetail?: string`, `webhookUrlExpected`, `matchedNumbers[]`, `unmatchedNumbers[]`
- **409** when `numbersFetchedCount === 0`: body `message: "No Twilio numbers found for this account"` — UI must not toast success

### POST /api/setup/provider/connect

- `success: boolean`
- `message: string`
- `verified?: boolean` — true only when credentials were saved and read back for current org
- `ok?: boolean`
- `orgId?: string`
- `checkedAt?: string`

### POST /api/setup/webhooks/install

- `webhookTarget: 'incoming_phone_numbers'` — IncomingPhoneNumbers only (not Messaging Service)
- `numbersFetchedCount: number` — count from `IncomingPhoneNumbers.list()` before update
- `numbersUpdatedCount: number` — count of numbers successfully updated
- `accountSidMasked: string | null`
- `firstTwilioError: string | null` — first error from Twilio during update (if any)
- `success: boolean`, `message: string`, `url?: string | null`, `verified?: boolean`, `webhookUrlConfigured?: boolean`, `orgId?: string`, `checkedAt?: string`, `updatedNumbers[]`, `details?`
- **409** when `numbersFetchedCount === 0`: `message: "No Twilio numbers found for this account"` — do not toast success

### GET /api/ops/twilio-setup-diagnostics (owner, non-prod)

Sample payload:

```json
{
  "orgId": "default",
  "credentialsExist": true,
  "accountSidUsed": "AC12...89ab",
  "webhookTarget": "incoming_phone_numbers",
  "webhookUrlExpected": "https://your-app.com/api/messages/webhook/twilio",
  "twilioConfiguredUrls": [
    { "phoneNumber": "+15551234567", "sid": "PN...", "smsUrl": "https://your-app.com/api/messages/webhook/twilio" }
  ],
  "errors": [],
  "checkedAt": "2025-02-20T12:00:00.000Z"
}
```

Fields:

- **orgId** — Current org (from session).
- **credentialsExist** — Whether DB has credentials for this org.
- **accountSidUsed** — Masked Account SID (first 4 + last 4).
- **webhookTarget** — Always `incoming_phone_numbers` (same object install configures and status checks).
- **webhookUrlExpected** — Exact URL we set and check for.
- **twilioConfiguredUrls** — Per-number `smsUrl` from Twilio (so you can compare to expected).
- **errors** — List of strings (e.g. "No credentials in DB", "No number has webhook URL matching expected").

## URL normalization

Install and status both use the same helper: `getTwilioWebhookUrl()` and `webhookUrlMatches(smsUrl)`. So:

- Same URL is used to configure and to check.
- Comparison allows path match and trims trailing slashes so Twilio’s response and our expected URL agree.

## Definition of Done

- [ ] **Connect Provider:** Click Save Credentials → UI flips to **Connected ✓** and stays so after refresh. No "Successfully connected" toast if status still shows Not Connected.
- [ ] **Install Webhooks:** Click Install Webhooks → UI flips to **Installed ✓** and stays so after refresh. Readiness shows Webhooks: Ready. No "Error checking webhooks" when credentials and Twilio are correct.
- [ ] **Verification failure:** If connect or install returns 200 but verification fails, UI shows blocking banner with "Copy Setup Diagnostics" and does not show Connected ✓ / Installed ✓.
- [ ] **Last checked:** Provider, Webhooks, and Readiness cards show "Last checked: &lt;timestamp&gt;" when the response includes `checkedAt`.
- [ ] **Copy Setup Diagnostics:** Button copies JSON (orgId, credentialsExist, accountSidUsed, webhookTarget, webhookUrlExpected, twilioConfiguredUrls, errors) to clipboard. (Endpoint 403 in production.)
