-- CreateTable
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "e164" TEXT NOT NULL,
    "label" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Sitter" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sitter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MessageNumber" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "e164" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignedSitterId" TEXT,
    "quarantinedReason" TEXT,
    "quarantineReleaseAt" TIMESTAMP(3),
    "providerType" TEXT NOT NULL,
    "providerNumberSid" TEXT,
    "purchaseCostCents" INTEGER,
    "purchaseDate" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Thread" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sitterId" TEXT,
    "numberId" TEXT NOT NULL,
    "threadType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerUnreadCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "body" TEXT NOT NULL,
    "redactedBody" TEXT,
    "hasPolicyViolation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerMessageSid" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MessageNumber_e164_key" ON "MessageNumber"("e164");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClientContact_clientId_e164_key" ON "ClientContact"("clientId", "e164");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Message_providerMessageSid_key" ON "Message"("providerMessageSid");

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_orgId_fkey') THEN
  ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Client_orgId_fkey') THEN
  ALTER TABLE "Client" ADD CONSTRAINT "Client_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientContact_clientId_fkey') THEN
  ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Sitter_orgId_fkey') THEN
  ALTER TABLE "Sitter" ADD CONSTRAINT "Sitter_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Sitter_userId_fkey') THEN
  ALTER TABLE "Sitter" ADD CONSTRAINT "Sitter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MessageNumber_orgId_fkey') THEN
  ALTER TABLE "MessageNumber" ADD CONSTRAINT "MessageNumber_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MessageNumber_assignedSitterId_fkey') THEN
  ALTER TABLE "MessageNumber" ADD CONSTRAINT "MessageNumber_assignedSitterId_fkey" FOREIGN KEY ("assignedSitterId") REFERENCES "Sitter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Thread_orgId_fkey') THEN
  ALTER TABLE "Thread" ADD CONSTRAINT "Thread_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Thread_clientId_fkey') THEN
  ALTER TABLE "Thread" ADD CONSTRAINT "Thread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Thread_sitterId_fkey') THEN
  ALTER TABLE "Thread" ADD CONSTRAINT "Thread_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "Sitter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Thread_numberId_fkey') THEN
  ALTER TABLE "Thread" ADD CONSTRAINT "Thread_numberId_fkey" FOREIGN KEY ("numberId") REFERENCES "MessageNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_orgId_fkey') THEN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_threadId_fkey') THEN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;
