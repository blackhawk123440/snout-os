-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Thread_orgId_lastActivityAt_idx" ON "Thread"("orgId", "lastActivityAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssignmentWindow_threadId_startsAt_endsAt_idx" ON "AssignmentWindow"("threadId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssignmentWindow_sitterId_startsAt_endsAt_idx" ON "AssignmentWindow"("sitterId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PolicyViolation_orgId_status_createdAt_idx" ON "PolicyViolation"("orgId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PolicyViolation_entityType_entityId_idx" ON "PolicyViolation"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Alert_orgId_status_severity_createdAt_idx" ON "Alert"("orgId", "status", "severity", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_orgId_ts_idx" ON "AuditEvent"("orgId", "ts" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS "AuditEvent_correlationIds_idx" ON "AuditEvent" USING gin ("correlationIds");
