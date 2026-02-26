-- Phase B: optional FK hardening after org backfill validation.
-- Apply this only after verifying all orgId values map to existing Org rows.

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "Client"
  ADD CONSTRAINT "Client_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "Sitter"
  ADD CONSTRAINT "Sitter_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;
