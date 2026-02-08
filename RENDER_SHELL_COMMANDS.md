# Commands to Run in Render Shell

## Step 1: Open Render Shell

1. Go to: https://dashboard.render.com/web/srv-d62mrjpr0fns738rirdg
2. Click "Shell" tab (or use SSH)
3. Run these commands:

---

## Step 2: Create Missing Database Tables

Run these commands **one at a time** in the Render shell:

```bash
cd /opt/render/project/src/enterprise-messaging-dashboard/apps/api
```

### Create ThreadParticipant table:
```bash
psql $DATABASE_URL -c 'CREATE TABLE IF NOT EXISTS "ThreadParticipant" ("id" TEXT NOT NULL, "threadId" TEXT NOT NULL, "participantType" TEXT NOT NULL, "participantId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ThreadParticipant_pkey" PRIMARY KEY ("id")); CREATE UNIQUE INDEX IF NOT EXISTS "ThreadParticipant_threadId_participantType_participantId_key" ON "ThreadParticipant"("threadId", "participantType", "participantId"); CREATE INDEX IF NOT EXISTS "ThreadParticipant_threadId_idx" ON "ThreadParticipant"("threadId"); DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''ThreadParticipant_threadId_fkey'\'') THEN ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;'
```

### Create MessageDelivery table:
```bash
psql $DATABASE_URL -c 'CREATE TABLE IF NOT EXISTS "MessageDelivery" ("id" TEXT NOT NULL, "messageId" TEXT NOT NULL, "attemptNo" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL, "providerErrorCode" TEXT, "providerErrorMessage" TEXT, "providerRaw" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MessageDelivery_pkey" PRIMARY KEY ("id")); CREATE INDEX IF NOT EXISTS "MessageDelivery_messageId_idx" ON "MessageDelivery"("messageId"); CREATE INDEX IF NOT EXISTS "MessageDelivery_status_idx" ON "MessageDelivery"("status"); CREATE INDEX IF NOT EXISTS "MessageDelivery_createdAt_idx" ON "MessageDelivery"("createdAt"); DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''MessageDelivery_messageId_fkey'\'') THEN ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;'
```

### Create AssignmentWindow table:
```bash
psql $DATABASE_URL -c 'CREATE TABLE IF NOT EXISTS "AssignmentWindow" ("id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "threadId" TEXT NOT NULL, "sitterId" TEXT NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "bookingRef" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AssignmentWindow_pkey" PRIMARY KEY ("id")); CREATE INDEX IF NOT EXISTS "AssignmentWindow_orgId_idx" ON "AssignmentWindow"("orgId"); CREATE INDEX IF NOT EXISTS "AssignmentWindow_threadId_idx" ON "AssignmentWindow"("threadId"); CREATE INDEX IF NOT EXISTS "AssignmentWindow_sitterId_idx" ON "AssignmentWindow"("sitterId"); CREATE INDEX IF NOT EXISTS "AssignmentWindow_startsAt_idx" ON "AssignmentWindow"("startsAt"); CREATE INDEX IF NOT EXISTS "AssignmentWindow_endsAt_idx" ON "AssignmentWindow"("endsAt"); DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''AssignmentWindow_orgId_fkey'\'') THEN ALTER TABLE "AssignmentWindow" ADD CONSTRAINT "AssignmentWindow_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''AssignmentWindow_threadId_fkey'\'') THEN ALTER TABLE "AssignmentWindow" ADD CONSTRAINT "AssignmentWindow_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''AssignmentWindow_sitterId_fkey'\'') THEN ALTER TABLE "AssignmentWindow" ADD CONSTRAINT "AssignmentWindow_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "Sitter"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;'
```

### Create RoutingOverride table:
```bash
psql $DATABASE_URL -c 'CREATE TABLE IF NOT EXISTS "RoutingOverride" ("id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "threadId" TEXT NOT NULL, "targetType" TEXT NOT NULL, "targetId" TEXT, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3), "reason" TEXT NOT NULL, "createdByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "removedAt" TIMESTAMP(3), CONSTRAINT "RoutingOverride_pkey" PRIMARY KEY ("id")); CREATE INDEX IF NOT EXISTS "RoutingOverride_orgId_idx" ON "RoutingOverride"("orgId"); CREATE INDEX IF NOT EXISTS "RoutingOverride_threadId_idx" ON "RoutingOverride"("threadId"); CREATE INDEX IF NOT EXISTS "RoutingOverride_startsAt_idx" ON "RoutingOverride"("startsAt"); CREATE INDEX IF NOT EXISTS "RoutingOverride_endsAt_idx" ON "RoutingOverride"("endsAt"); DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''RoutingOverride_orgId_fkey'\'') THEN ALTER TABLE "RoutingOverride" ADD CONSTRAINT "RoutingOverride_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''RoutingOverride_threadId_fkey'\'') THEN ALTER TABLE "RoutingOverride" ADD CONSTRAINT "RoutingOverride_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''RoutingOverride_targetId_fkey'\'') THEN ALTER TABLE "RoutingOverride" ADD CONSTRAINT "RoutingOverride_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Sitter"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;'
```

### Create PolicyViolation table:
```bash
psql $DATABASE_URL -c 'CREATE TABLE IF NOT EXISTS "PolicyViolation" ("id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "threadId" TEXT NOT NULL, "messageId" TEXT, "violationType" TEXT NOT NULL, "detectedSummary" TEXT NOT NULL, "detectedRedacted" TEXT, "actionTaken" TEXT NOT NULL, "status" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedByUserId" TEXT, "resolvedAt" TIMESTAMP(3), CONSTRAINT "PolicyViolation_pkey" PRIMARY KEY ("id")); CREATE INDEX IF NOT EXISTS "PolicyViolation_orgId_idx" ON "PolicyViolation"("orgId"); CREATE INDEX IF NOT EXISTS "PolicyViolation_threadId_idx" ON "PolicyViolation"("threadId"); CREATE INDEX IF NOT EXISTS "PolicyViolation_status_idx" ON "PolicyViolation"("status"); CREATE INDEX IF NOT EXISTS "PolicyViolation_createdAt_idx" ON "PolicyViolation"("createdAt"); DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''PolicyViolation_orgId_fkey'\'') THEN ALTER TABLE "PolicyViolation" ADD CONSTRAINT "PolicyViolation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''PolicyViolation_threadId_fkey'\'') THEN ALTER TABLE "PolicyViolation" ADD CONSTRAINT "PolicyViolation_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''PolicyViolation_messageId_fkey'\'') THEN ALTER TABLE "PolicyViolation" ADD CONSTRAINT "PolicyViolation_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;'
```

### Create Automation table:
```bash
psql $DATABASE_URL -c 'CREATE TABLE IF NOT EXISTS "Automation" ("id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "lane" TEXT NOT NULL, "status" TEXT NOT NULL, "trigger" JSONB NOT NULL, "conditions" JSONB NOT NULL, "actions" JSONB NOT NULL, "templates" JSONB NOT NULL, "lastExecutedAt" TIMESTAMP(3), "lastTestedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")); CREATE INDEX IF NOT EXISTS "Automation_orgId_idx" ON "Automation"("orgId"); CREATE INDEX IF NOT EXISTS "Automation_status_idx" ON "Automation"("status"); CREATE INDEX IF NOT EXISTS "Automation_lane_idx" ON "Automation"("lane"); DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''Automation_orgId_fkey'\'') THEN ALTER TABLE "Automation" ADD CONSTRAINT "Automation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;'
```

### Create AutomationExecution table:
```bash
psql $DATABASE_URL -c 'CREATE TABLE IF NOT EXISTS "AutomationExecution" ("id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "automationId" TEXT NOT NULL, "status" TEXT NOT NULL, "triggerContext" JSONB NOT NULL, "conditionResults" JSONB, "actionResults" JSONB, "error" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")); CREATE INDEX IF NOT EXISTS "AutomationExecution_orgId_idx" ON "AutomationExecution"("orgId"); CREATE INDEX IF NOT EXISTS "AutomationExecution_automationId_idx" ON "AutomationExecution"("automationId"); CREATE INDEX IF NOT EXISTS "AutomationExecution_status_idx" ON "AutomationExecution"("status"); CREATE INDEX IF NOT EXISTS "AutomationExecution_createdAt_idx" ON "AutomationExecution"("createdAt"); DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''AutomationExecution_orgId_fkey'\'') THEN ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''AutomationExecution_automationId_fkey'\'') THEN ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;'
```

### Create Alert table:
```bash
psql $DATABASE_URL -c 'CREATE TABLE IF NOT EXISTS "Alert" ("id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "severity" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "entityType" TEXT, "entityId" TEXT, "status" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3), "resolvedByUserId" TEXT, CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")); CREATE INDEX IF NOT EXISTS "Alert_orgId_idx" ON "Alert"("orgId"); CREATE INDEX IF NOT EXISTS "Alert_severity_idx" ON "Alert"("severity"); CREATE INDEX IF NOT EXISTS "Alert_status_idx" ON "Alert"("status"); CREATE INDEX IF NOT EXISTS "Alert_createdAt_idx" ON "Alert"("createdAt"); DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''Alert_orgId_fkey'\'') THEN ALTER TABLE "Alert" ADD CONSTRAINT "Alert_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;'
```

### Create AuditEvent table:
```bash
psql $DATABASE_URL -c 'CREATE TABLE IF NOT EXISTS "AuditEvent" ("id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "actorType" TEXT NOT NULL, "actorId" TEXT, "entityType" TEXT, "entityId" TEXT, "eventType" TEXT NOT NULL, "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "correlationIds" JSONB NOT NULL, "payload" JSONB NOT NULL, "schemaVersion" INTEGER NOT NULL DEFAULT 1, CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")); CREATE INDEX IF NOT EXISTS "AuditEvent_orgId_idx" ON "AuditEvent"("orgId"); CREATE INDEX IF NOT EXISTS "AuditEvent_actorType_idx" ON "AuditEvent"("actorType"); CREATE INDEX IF NOT EXISTS "AuditEvent_entityType_idx" ON "AuditEvent"("entityType"); CREATE INDEX IF NOT EXISTS "AuditEvent_eventType_idx" ON "AuditEvent"("eventType"); CREATE INDEX IF NOT EXISTS "AuditEvent_ts_idx" ON "AuditEvent"("ts"); CREATE INDEX IF NOT EXISTS "AuditEvent_orgId_ts_idx" ON "AuditEvent"("orgId", "ts" DESC); CREATE INDEX IF NOT EXISTS "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId"); CREATE INDEX IF NOT EXISTS "AuditEvent_correlationIds_idx" ON "AuditEvent" USING gin ("correlationIds"); DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\''AuditEvent_orgId_fkey'\'') THEN ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;'
```

### Apply performance indexes:
```bash
psql $DATABASE_URL < prisma/migrations/20260119000000_add_performance_indexes/migration.sql
```

---

## Step 3: Seed Database

```bash
pnpm db:seed
```

**Expected output:**
```
🌱 Seeding database...
✅ Created organization: ...
✅ Created owner user: owner@example.com
✅ Created sitters
✅ Created sitter user: sitter@example.com
✅ Created clients
✅ Created numbers
✅ Created threads
✅ Created assignment window
✅ Created sample messages
✅ Created sample automation
✅ Created sample alert
✅ Created policy violation example
✅ Created failed delivery example
✅ Created owner-routed thread example

🎉 Seeding complete!
```

---

## Step 4: Verify Everything Works

### Check API health:
```bash
curl https://snout-os-api.onrender.com/health
```

**Expected:** `{"status":"ok","timestamp":"...","service":"snout-os-api"}`

### Check Web service:
```bash
curl https://snout-os-staging.onrender.com
```

**Expected:** HTML response (Next.js app)

---

## Step 5: Generate Proof Pack (Local)

Once everything is working, run this locally:

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
API_PUBLIC_URL=https://snout-os-api.onrender.com \
WEB_PUBLIC_URL=https://snout-os-staging.onrender.com \
JWT_SECRET=<same value as set on API service> \
OWNER_EMAIL=owner@example.com \
OWNER_PASSWORD=password123 \
pnpm proof:deployment
```

This will create a `proof-pack/` folder with all verification evidence.
