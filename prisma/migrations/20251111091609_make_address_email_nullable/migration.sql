-- AlterTable: Make address and email nullable for pet taxi bookings
ALTER TABLE "Booking" ALTER COLUMN "address" DROP NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "email" DROP NOT NULL;
