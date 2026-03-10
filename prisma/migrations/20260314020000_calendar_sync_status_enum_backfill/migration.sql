-- Convert BookingCalendarEvent.syncStatus from free-form text to enum and backfill historical rows.
CREATE TYPE "CalendarSyncStatus" AS ENUM (
  'PENDING',
  'SYNCED',
  'FAILED',
  'DISABLED',
  'AUTH_EXPIRED'
);

-- Historical classification backfill (one-time):
-- 1) external event exists and no terminal error => SYNCED
-- 2) auth-expired indicators => AUTH_EXPIRED
-- 3) sync disabled or missing calendar config => DISABLED
-- 4) explicit sync error => FAILED
-- 5) fallback => PENDING
WITH classified AS (
  SELECT
    bce.id,
    CASE
      WHEN (
        COALESCE(bce."externalEventId", bce."googleCalendarEventId") IS NOT NULL
        AND NULLIF(TRIM(COALESCE(bce."lastSyncError", '')), '') IS NULL
      ) THEN 'SYNCED'
      WHEN (
        COALESCE(s."googleAuthExpired", false) = true
        OR LOWER(COALESCE(bce."lastSyncError", '')) LIKE '%invalid_grant%'
        OR LOWER(COALESCE(bce."lastSyncError", '')) LIKE '%auth expired%'
      ) THEN 'AUTH_EXPIRED'
      WHEN (
        COALESCE(s."calendarSyncEnabled", false) = false
        OR COALESCE(NULLIF(TRIM(s."googleRefreshToken"), ''), NULL) IS NULL
        OR COALESCE(NULLIF(TRIM(s."googleCalendarId"), ''), NULL) IS NULL
      ) THEN 'DISABLED'
      WHEN NULLIF(TRIM(COALESCE(bce."lastSyncError", '')), '') IS NOT NULL THEN 'FAILED'
      ELSE 'PENDING'
    END AS mapped_status
  FROM "BookingCalendarEvent" bce
  LEFT JOIN "Sitter" s ON s.id = bce."sitterId"
)
UPDATE "BookingCalendarEvent" bce
SET "syncStatus" = classified.mapped_status
FROM classified
WHERE bce.id = classified.id;

ALTER TABLE "BookingCalendarEvent"
ALTER COLUMN "syncStatus" DROP DEFAULT,
ALTER COLUMN "syncStatus" TYPE "CalendarSyncStatus"
USING (
  CASE
    WHEN "syncStatus" IS NULL THEN 'PENDING'::"CalendarSyncStatus"
    WHEN UPPER(REPLACE("syncStatus", '-', '_')) = 'AUTH_EXPIRED' THEN 'AUTH_EXPIRED'::"CalendarSyncStatus"
    WHEN UPPER(REPLACE("syncStatus", '-', '_')) IN ('PENDING', 'SYNCED', 'FAILED', 'DISABLED')
      THEN UPPER(REPLACE("syncStatus", '-', '_'))::"CalendarSyncStatus"
    ELSE 'PENDING'::"CalendarSyncStatus"
  END
),
ALTER COLUMN "syncStatus" SET DEFAULT 'PENDING';
