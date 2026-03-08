# Full-System QA Sweep — Final Platform Closeout

**Purpose:** Verify core flows across owner, sitter, client, and key platform surfaces. Proof-only; no new feature work unless a real bug is discovered during proof.

**Staging base URL:** `https://snout-os-staging.onrender.com` (or your staging URL)

**Health check:** `curl -s "https://<STAGING>/api/health" | jq .` — confirm `status`, `db`, `redis`, `commitSha`.

---

## 1. Owner core flows

| Check | Route / action | Pass? | Notes |
|-------|----------------|-------|--------|
| Dashboard loads | `/dashboard` | [ ] | KPIs, quick actions; no crash |
| Command Center loads | `/command-center` | [ ] | Queues, attention items |
| Bookings list | `/bookings` | [ ] | List or empty state |
| Calendar loads | `/calendar` | [ ] | Top-bar filters, grid, no left rail |
| Clients loads | `/clients` | [ ] | List or empty state |
| Sitters loads | `/sitters` | [ ] | No "Organization ID missing" |
| Growth / Tiers | `/growth` | [ ] | No Forbidden |
| Payroll loads | `/payroll` | [ ] | Summary card, runs table |
| Reports loads | `/reports` | [ ] | Executive summary / KPIs |
| Payments loads | `/payments` | [ ] | Revenue / transactions |
| Finance loads | `/finance` | [ ] | As configured |
| Settings loads | `/settings` | [ ] | Owner settings |
| Owner shell consistent | All above | [ ] | Same chrome (OwnerAppShell, PageHeader, Section) |

**Evidence / issues:**

```text

```

---

## 2. Sitter core flows

| Check | Route / action | Pass? | Notes |
|-------|----------------|-------|--------|
| Sitter shell / home | `/sitter` or sitter entry | [ ] | Correct layout and nav |
| Bookings (sitter) | `/sitter/bookings` or equivalent | [ ] | Assigned bookings |
| Availability | `/sitter/availability` or equivalent | [ ] | If applicable |
| Earnings / profile | As per sitter app | [ ] | No 403/500 on core pages |

**Evidence / issues:**

```text

```

---

## 3. Client core flows

| Check | Route / action | Pass? | Notes |
|-------|----------------|-------|--------|
| Client shell / home | `/client` or client entry | [ ] | Correct layout and nav |
| Bookings (client) | Client bookings view | [ ] | List or empty state |
| Messages (client) | Client messages view | [ ] | If applicable |
| Billing / profile | As per client app | [ ] | No 403/500 on core pages |

**Evidence / issues:**

```text

```

---

## 4. Messaging

| Check | Route / action | Pass? | Notes |
|-------|----------------|-------|--------|
| Messaging hub | `/messaging` | [ ] | Modules / Inbox link |
| Owner Inbox | `/messaging/inbox` | [ ] | Thread list, client/sitter context, New message |
| Thread open & reply | Select thread, send message | [ ] | No crash; delivery as expected |
| Sitters / Numbers / Routing | `/messaging/sitters`, numbers, assignments | [ ] | Load without error |

**Evidence / issues:**

```text

```

---

## 5. Calendar

| Check | Route / action | Pass? | Notes |
|-------|----------------|-------|--------|
| Calendar page | `/calendar` | [ ] | Filters in top bar, grid, Today/Upcoming |
| Conflict indicators | Events in conflict | [ ] | Red/icon where applicable |
| Day / Week / Month | View switch | [ ] | Renders without error |
| Event click → drawer | Click event | [ ] | Details drawer opens |

**Evidence / issues:**

```text

```

---

## 6. Payroll

| Check | Route / action | Pass? | Notes |
|-------|----------------|-------|--------|
| Payroll page | `/payroll` | [ ] | Pay period block, total payout, runs table |
| Run detail modal | View a run | [ ] | Sitter payout rows, export |
| Approve / Export | Actions available | [ ] | As per design (no regression) |

**Evidence / issues:**

```text

```

---

## 7. Reports

| Check | Route / action | Pass? | Notes |
|-------|----------------|-------|--------|
| Reports page | `/reports` | [ ] | Executive summary, period KPIs |
| Trust states | $0 revenue / 0% retention with bookings | [ ] | Honest copy (e.g. "No collected payments yet") |

**Evidence / issues:**

```text

```

---

## 8. Automations

| Check | Route / action | Pass? | Notes |
|-------|----------------|-------|--------|
| Automations list | `/automations` | [ ] | Cards, Enabled/Disabled, "Edit & test message" |
| Enable/disable | Toggle, refresh | [ ] | State persists |
| Edit & test | `/automations/<id>`, test message | [ ] | Template edit, POST test-message success |
| Automation failures | `/ops/automation-failures` | [ ] | List loads; retry endpoint works if events exist |

**Evidence / issues:**

```text

```

---

## 9. Integrations

| Check | Route / action | Pass? | Notes |
|-------|----------------|-------|--------|
| Integrations page | `/integrations` | [ ] | Loads without error; config as expected |

**Evidence / issues:**

```text

```

---

## 10. Queues / workers / Redis health

| Check | How | Pass? | Notes |
|-------|-----|-------|--------|
| Health endpoint | `GET /api/health` | [ ] | `redis: "ok"`, `db: "ok"`, `status: "ok"` |
| Worker logs (staging) | Render/host → worker service logs | [ ] | commitSha, Redis connected, Automations + Calendar (+ Payout) queues ready |
| Job processing | Trigger an automation or calendar sync | [ ] | Job consumed (or verify via logs/EventLog) |

**Evidence / issues:**

```text

```

---

## Sign-off

- [ ] Owner core flows verified (or issues logged).
- [ ] Sitter core flows verified (or issues logged).
- [ ] Client core flows verified (or issues logged).
- [ ] Messaging verified (or issues logged).
- [ ] Calendar verified (or issues logged).
- [ ] Payroll verified (or issues logged).
- [ ] Reports verified (or issues logged).
- [ ] Automations verified (or issues logged).
- [ ] Integrations verified (or issues logged).
- [ ] Queues/workers/Redis health verified (or issues logged).

**Full-system sweep status:** _________________

**Date:** _________________

**Notes:** No new feature work unless a real bug is discovered during this proof. Log any bugs in this doc or your issue tracker; fix only confirmed bugs before closing out.
