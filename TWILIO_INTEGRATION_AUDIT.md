# Twilio Integration Audit

## PHASE 0 - AUDIT RESULTS

### A) Messaging Models (CANONICAL - TO REUSE)

**MessageThread Model:**
- Location: `prisma/schema.prisma` line 1097
- Fields: `assignedSitterId`, `scope`, `bookingId`, `clientId`, `maskedNumberE164`, `numberClass`
- **NO mailboxOwnerType/mailboxOwnerId fields** - Need to derive mailbox from existing fields
- Mailbox derivation rule:
  - Sitter mailbox: `assignedSitterId IS NOT NULL` AND `scope IN ('client_booking', 'client_general')`
  - Owner mailbox: `scope = 'internal'` OR `assignedSitterId IS NULL` AND `scope = 'owner_sitter'`

**MessageEvent Model:**
- Location: `prisma/schema.prisma` line 1165
- Fields: `threadId`, `direction`, `actorType`, `body`, `providerMessageSid`, `createdAt`
- Already supports inbound/outbound tracking

**MessageResponseLink Model:**
- Location: `prisma/schema.prisma` line 1564
- Tracks response times: `requiresResponseEventId`, `responseEventId`, `responseSeconds`
- **ALREADY CONNECTED TO TIER METRICS** via `tier-engine-twilio.ts`

### B) Twilio (EXISTS - TO REUSE)

**Twilio Provider:**
- Location: `src/lib/messaging/providers/twilio.ts`
- Has: `verifyWebhook()`, `parseInbound()`, `sendMessage()`
- Webhook signature verification: ✅ EXISTS

**Number Mapping:**
- Location: `src/lib/messaging/number-org-mapping.ts`
- Function: `getOrgIdFromNumber(toNumberE164)` - maps Twilio number to orgId
- **MISSING**: Function to map number to sitterId (need to add)

**Webhook Endpoints:**
- **NOT FOUND** in Next.js app (only in enterprise-messaging-dashboard NestJS API)
- Need to create: `POST /api/twilio/inbound` or reuse existing if found

### C) Offers (EXISTS - TO REUSE)

**OfferEvent Model:**
- Location: `prisma/schema.prisma` (OfferEvent model)
- Fields: `sitterId`, `bookingId`, `status`, `offeredAt`, `acceptedAt`, `declinedAt`, `expiresAt`

**Accept Endpoint:**
- Location: `src/app/api/sitter/[id]/bookings/[bookingId]/accept/route.ts`
- ✅ EXISTS - Idempotent, records audit events, updates metrics
- **TO REUSE** for SMS YES command

**Decline Endpoint:**
- Location: `src/app/api/sitter/[id]/bookings/[bookingId]/decline/route.ts`
- ✅ EXISTS - Idempotent, records audit events, updates metrics
- **TO REUSE** for SMS NO command

### D) Tiers (EXISTS - TO REUSE)

**Tier Engine:**
- Location: `src/lib/tiers/tier-engine-twilio.ts`
- Functions: `computeTierForSitter()`, `computeMetricsFromEvents()`
- **ALREADY USES**: `MessageResponseLink` for messaging response times
- **ALREADY USES**: `OfferEvent` for offer response times

**SitterMetricsWindow:**
- Location: `prisma/schema.prisma` line 1538
- Fields: `avgResponseSeconds`, `medianResponseSeconds`, `responseRate`, `offerAcceptRate`, etc.
- **ALREADY TRACKS** messaging and offer response metrics

**MessageResponseLink:**
- Already tracks: `responseSeconds` (time from requiresResponseEvent to responseEvent)
- **TIER ENGINE ALREADY CONNECTED** - no changes needed

### E) Audit (EXISTS - TO REUSE)

**EventLog Model:**
- Location: `prisma/schema.prisma` (EventLog model)
- Fields: `eventType`, `status`, `metadata`, `bookingId`

**Audit Events Helper:**
- Location: `src/lib/audit-events.ts`
- Functions: `recordSitterAuditEvent()`, `recordOfferAccepted()`, `recordOfferDeclined()`
- ✅ EXISTS - ready to use

---

## WHAT'S MISSING

1. **Mailbox Separation:**
   - Add mailbox derivation logic (derive from `assignedSitterId` + `scope`)
   - Update `/api/sitters/[id]/messages` to filter by sitter mailbox
   - Update owner inbox to exclude sitter mailbox threads

2. **Twilio Webhook Endpoint:**
   - Create `POST /api/twilio/inbound` (or check if exists elsewhere)
   - Verify signature, parse payload, route to correct thread
   - Handle YES/NO command parsing

3. **Number to Sitter Mapping:**
   - Add function to map `To` number to `sitterId` via `MessageNumber.assignedSitterId`

4. **YES/NO Command Handler:**
   - Parse YES/NO commands from inbound SMS
   - Call existing accept/decline endpoints
   - Send TwiML confirmation

5. **Messaging Response Time for Tiers:**
   - **ALREADY EXISTS** via `MessageResponseLink` and `tier-engine-twilio.ts`
   - No changes needed

---

## IMPLEMENTATION PLAN

1. Add mailbox derivation helper (derive from existing fields, no schema change)
2. Create/update Twilio webhook endpoint
3. Add number-to-sitter mapping helper
4. Add YES/NO command parsing and handler
5. Ensure all actions are auditable (already done via existing endpoints)
