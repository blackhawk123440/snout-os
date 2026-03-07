# Automations — Final Sign-off

Automations is **code-complete** but not formally **COMPLETE** until staging proof is done. This doc is the signoff checklist and evidence.

---

## Local proof (no staging server)

The following was captured locally. **Staging** must have the app and worker running with real Redis and DB; then re-run the runbook and paste staging results below.

- **Worker startup (local, Redis not running):**  
  - `[Worker] Starting background workers...`  
  - `[Worker] commitSha: unknown`  
  - `[Worker] Redis: connected` (worker logs this before IORedis connect; on staging with Redis the connection succeeds and queues initialize.)  
  - `[Worker] Automations queue ready` and `[Worker] Queues initialized. Processing jobs.` appear only after Redis connects (staging).
- **Health:** Run against staging URL when available: `curl -s "https://<staging-url>/api/health" | jq .`  
  Expected shape: `{ "status", "db", "redis", "version", "commitSha", "buildTime", "envName", "timestamp" }`.
- **UI / test-message / failure / access:** Require staging app + owner session; follow runbook below.

---

## Runbook (execute on staging)

1. **Health**  
   `curl -s "https://<staging-url>/api/health" | jq .`  
   Paste the JSON in **§ 1) /api/health JSON** below.

2. **Worker proof**  
   Capture worker logs showing: `commitSha`, Redis connected, `[Worker] Automations queue ready`, queues processing.  
   Paste in **§ 2) Worker log proof** below.

3. **UI proof**  
   - Open `/automations` — page loads.  
   - List shows real items (six automation types).  
   - Toggle one automation enabled/disabled → refresh → state persists.  
   - Open detail for one type (e.g. `/automations/bookingConfirmation`) — loads.  
   - Edit a template → Save → refresh → template persists.  
   Note any issues in **§ 3) UI proof** below.

4. **Test message proof**  
   As owner/admin: `POST /api/automations/test-message` with `{ "template": "Test message", "phoneNumber": "+1..." }`.  
   Confirm success and any EventLog/message record. Note in **§ 4) Test message proof** below.

5. **Failure surface proof**  
   - `/ops/automation-failures` loads.  
   - Retry path still works or is reachable and unchanged.  
   Note in **§ 5) Failure surface proof** below.

6. **Access proof**  
   - Sitter/client: `GET /api/automations` → 403 Forbidden.  
   - Owner/admin: `GET /api/automations` → 200, body has `items`.  
   Note in **§ 6) Access-control confirmation** below.

7. **Sign-off**  
   When all sections have evidence and pass, check the boxes and set **Automations status: COMPLETE**.

---

## 1) /api/health JSON

Paste output of: `curl -s "https://<staging-url>/api/health" | jq .`

```json

```

---

## 2) Worker log proof

Evidence that the worker is live and the automations queue is ready:

- `[Worker] commitSha: ...`
- Redis: connected (or equivalent)
- `[Worker] Automations queue ready`
- `[Worker] Queues initialized. Processing jobs.` (or similar)

**Example (staging with Redis):**
```text
[Worker] Starting background workers...
[Worker] commitSha: abc1234
[Worker] Redis: connected
[Worker] REDIS_URL: redis://****
[Worker] Automations queue ready
[Worker] Calendar queue ready
[Worker] Payout queue ready
[Worker] Queues initialized. Processing jobs.
```

Paste relevant worker log lines from staging:

```text

```

---

## 3) UI proof (list, detail, toggle, template persistence)

- [ ] `/automations` loads.
- [ ] List shows real items (six automation types).
- [ ] Toggling enabled/disabled persists after refresh.
- [ ] Detail page loads for at least one automation type (e.g. `/automations/bookingConfirmation`).
- [ ] Template save persists after refresh.

Notes:

```text

```

---

## 4) Test message proof

- [ ] `POST /api/automations/test-message` works for owner/admin (success path).
- [ ] Any resulting message record or EventLog entry confirmed (or N/A if not logged).

Notes:

```text

```

---

## 5) Failure surface proof

- [ ] `/ops/automation-failures` loads.
- [ ] Retry path still works or remains reachable and unchanged.

Notes:

```text

```

---

## 6) Access-control confirmation

- [ ] Sitter/client: `GET /api/automations` → 403 Forbidden.
- [ ] Owner/admin: `GET /api/automations` → 200, response has `items` array.

**Quick check (with session cookies or auth header for each role):**
```bash
# As sitter or client — expect 403
curl -s -o /dev/null -w "%{http_code}" "https://<staging>/api/automations"
# As owner or admin — expect 200 and body.items
curl -s "https://<staging>/api/automations" -H "Cookie: ..." | jq '.items | length'
```

Notes:

```text

```

---

## Sign-off

- [ ] § 1) /api/health JSON pasted above.
- [ ] § 2) Worker log proof pasted above; worker live and Automations queue ready.
- [ ] § 3) UI proof: list, detail, toggle, template persistence confirmed.
- [ ] § 4) Test message proof confirmed.
- [ ] § 5) Failure surface proof confirmed.
- [ ] § 6) Access-control (sitter/client 403, owner/admin 200) confirmed.

**Automations status:** _PENDING_ → **COMPLETE** (only after all checkboxes are checked and evidence is in place).

---

## Staging proof pass summary

| Check | Done in repo | Staging (you) |
|-------|----------------|---------------|
| 1) Health | — | Run `curl -s "https://<staging>/api/health" \| jq .` and paste JSON above. |
| 2) Worker proof | Local worker logs show commitSha + Redis line; "Automations queue ready" requires Redis. | Paste staging worker logs showing Automations queue ready. |
| 3) UI proof | — | Confirm /automations list, toggle, detail, template save and refresh. |
| 4) Test message | — | POST /api/automations/test-message as owner; confirm success. |
| 5) Failure surface | — | Confirm /ops/automation-failures loads and retry path. |
| 6) Access | — | Confirm sitter/client 403, owner/admin 200 on /api/automations. |

When all staging evidence is pasted and checkboxes checked, set **Automations status: COMPLETE**.
