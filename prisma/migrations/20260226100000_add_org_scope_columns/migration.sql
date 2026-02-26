-- Phase A: add org-scoping columns with safe defaults/backfill.
-- This migration is intentionally additive and non-destructive.

INSERT INTO "Org" ("id", "name", "mode", "createdAt", "updatedAt")
VALUES ('default', 'Default Org', 'personal', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "TimeSlot" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "Sitter" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "SitterPoolOffer" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "BookingSitterPool" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "Automation" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "AutomationRun" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "AutomationRunStep" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "CustomFieldValue" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "DiscountUsage" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "BookingTagAssignment" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'owner';
ALTER TABLE "BaselineSnapshot" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "EventLog" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "BookingStatusHistory" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "StripeCharge" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';
ALTER TABLE "BookingCalendarEvent" ADD COLUMN IF NOT EXISTS "orgId" TEXT DEFAULT 'default';

-- Backfill Booking.orgId from Client.orgId where possible.
UPDATE "Booking" b
SET "orgId" = c."orgId"
FROM "Client" c
WHERE b."clientId" = c."id"
  AND (b."orgId" IS NULL OR b."orgId" = 'default');

-- Backfill booking-adjacent orgId via Booking.
UPDATE "Pet" p
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE p."bookingId" = b."id"
  AND (p."orgId" IS NULL OR p."orgId" = 'default');

UPDATE "TimeSlot" t
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE t."bookingId" = b."id"
  AND (t."orgId" IS NULL OR t."orgId" = 'default');

UPDATE "SitterPoolOffer" s
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE s."bookingId" = b."id"
  AND (s."orgId" IS NULL OR s."orgId" = 'default');

UPDATE "BookingSitterPool" bsp
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE bsp."bookingId" = b."id"
  AND (bsp."orgId" IS NULL OR bsp."orgId" = 'default');

UPDATE "Message" m
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE m."bookingId" = b."id"
  AND (m."orgId" IS NULL OR m."orgId" = 'default');

UPDATE "Report" r
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE r."bookingId" = b."id"
  AND (r."orgId" IS NULL OR r."orgId" = 'default');

UPDATE "DiscountUsage" d
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE d."bookingId" = b."id"
  AND (d."orgId" IS NULL OR d."orgId" = 'default');

UPDATE "BookingTagAssignment" bta
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE bta."bookingId" = b."id"
  AND (bta."orgId" IS NULL OR bta."orgId" = 'default');

UPDATE "EventLog" e
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE e."bookingId" = b."id"
  AND (e."orgId" IS NULL OR e."orgId" = 'default');

UPDATE "BookingStatusHistory" bsh
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE bsh."bookingId" = b."id"
  AND (bsh."orgId" IS NULL OR bsh."orgId" = 'default');

UPDATE "BaselineSnapshot" bs
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE bs."bookingId" = b."id"
  AND (bs."orgId" IS NULL OR bs."orgId" = 'default');

UPDATE "StripeCharge" sc
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE sc."bookingId" = b."id"
  AND (sc."orgId" IS NULL OR sc."orgId" = 'default');

UPDATE "BookingCalendarEvent" bce
SET "orgId" = b."orgId"
FROM "Booking" b
WHERE bce."bookingId" = b."id"
  AND (bce."orgId" IS NULL OR bce."orgId" = 'default');

-- Enforce non-null after backfill.
ALTER TABLE "Booking" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Pet" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "TimeSlot" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Sitter" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "SitterPoolOffer" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "BookingSitterPool" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Message" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Automation" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "AutomationRun" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "AutomationRunStep" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "CustomFieldValue" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "DiscountUsage" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "BookingTagAssignment" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "BaselineSnapshot" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "EventLog" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "BookingStatusHistory" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "StripeCharge" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "BookingCalendarEvent" ALTER COLUMN "orgId" SET NOT NULL;

-- Indexes for scoped access patterns.
CREATE INDEX IF NOT EXISTS "Booking_orgId_idx" ON "Booking"("orgId");
CREATE INDEX IF NOT EXISTS "Booking_orgId_startAt_idx" ON "Booking"("orgId", "startAt");
CREATE INDEX IF NOT EXISTS "Booking_orgId_sitterId_idx" ON "Booking"("orgId", "sitterId");
CREATE INDEX IF NOT EXISTS "Pet_orgId_idx" ON "Pet"("orgId");
CREATE INDEX IF NOT EXISTS "TimeSlot_orgId_idx" ON "TimeSlot"("orgId");
CREATE INDEX IF NOT EXISTS "Sitter_orgId_idx" ON "Sitter"("orgId");
CREATE INDEX IF NOT EXISTS "SitterPoolOffer_orgId_idx" ON "SitterPoolOffer"("orgId");
CREATE INDEX IF NOT EXISTS "BookingSitterPool_orgId_idx" ON "BookingSitterPool"("orgId");
CREATE INDEX IF NOT EXISTS "Message_orgId_idx" ON "Message"("orgId");
CREATE INDEX IF NOT EXISTS "Report_orgId_idx" ON "Report"("orgId");
CREATE INDEX IF NOT EXISTS "Automation_orgId_idx" ON "Automation"("orgId");
CREATE INDEX IF NOT EXISTS "AutomationRun_orgId_idx" ON "AutomationRun"("orgId");
CREATE INDEX IF NOT EXISTS "AutomationRunStep_orgId_idx" ON "AutomationRunStep"("orgId");
CREATE INDEX IF NOT EXISTS "CustomFieldValue_orgId_idx" ON "CustomFieldValue"("orgId");
CREATE INDEX IF NOT EXISTS "DiscountUsage_orgId_idx" ON "DiscountUsage"("orgId");
CREATE INDEX IF NOT EXISTS "BookingTagAssignment_orgId_idx" ON "BookingTagAssignment"("orgId");
CREATE INDEX IF NOT EXISTS "User_orgId_idx" ON "User"("orgId");
CREATE INDEX IF NOT EXISTS "BaselineSnapshot_orgId_idx" ON "BaselineSnapshot"("orgId");
CREATE INDEX IF NOT EXISTS "EventLog_orgId_idx" ON "EventLog"("orgId");
CREATE INDEX IF NOT EXISTS "BookingStatusHistory_orgId_idx" ON "BookingStatusHistory"("orgId");
CREATE INDEX IF NOT EXISTS "StripeCharge_orgId_idx" ON "StripeCharge"("orgId");
CREATE INDEX IF NOT EXISTS "BookingCalendarEvent_orgId_idx" ON "BookingCalendarEvent"("orgId");
