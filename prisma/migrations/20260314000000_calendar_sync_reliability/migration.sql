-- Calendar sync reliability hardening
ALTER TABLE "Sitter"
ADD COLUMN "googleAuthExpired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "googleAuthError" TEXT;

ALTER TABLE "BookingCalendarEvent"
ADD COLUMN "externalEventId" TEXT,
ADD COLUMN "syncedCalendarId" TEXT,
ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "lastSyncAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastSyncError" TEXT,
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "failureMetadata" TEXT;
