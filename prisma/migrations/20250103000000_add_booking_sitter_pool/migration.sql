-- CreateTable
CREATE TABLE "BookingSitterPool" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "BookingSitterPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingSitterPool_bookingId_sitterId_key" ON "BookingSitterPool"("bookingId", "sitterId");

-- CreateIndex
CREATE INDEX "BookingSitterPool_bookingId_idx" ON "BookingSitterPool"("bookingId");

-- CreateIndex
CREATE INDEX "BookingSitterPool_sitterId_idx" ON "BookingSitterPool"("sitterId");

-- AddForeignKey
ALTER TABLE "BookingSitterPool" ADD CONSTRAINT "BookingSitterPool_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSitterPool" ADD CONSTRAINT "BookingSitterPool_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "Sitter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
