-- AlterTable: Add pickupAddress and dropoffAddress to Booking
ALTER TABLE "Booking" ALTER COLUMN "address" DROP NOT NULL;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "dropoffAddress" TEXT;
