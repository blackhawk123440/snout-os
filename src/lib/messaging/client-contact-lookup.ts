/**
 * ClientContact lookup by orgId + e164 using raw SQL.
 * Use this to avoid the generated Prisma client bug that references "orgld" instead of "orgId".
 */

import { prisma } from '@/lib/db';

export type ClientContactRow = {
  id: string;
  orgId: string;
  clientId: string;
  e164: string;
  label: string | null;
  verified: boolean;
};

/**
 * Find a ClientContact by orgId and e164. Uses raw SQL so the correct "orgId" column is used.
 */
export async function findClientContactByPhone(
  orgId: string,
  e164: string
): Promise<ClientContactRow | null> {
  const rows = await prisma.$queryRaw<ClientContactRow[]>`
    SELECT id, "orgId", "clientId", e164, label, verified FROM "ClientContact"
    WHERE "orgId" = ${orgId} AND e164 = ${e164}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Insert a ClientContact. Uses raw SQL so the "orgId" column is used correctly.
 */
export async function createClientContact(params: {
  id: string;
  orgId: string;
  clientId: string;
  e164: string;
  label?: string;
  verified?: boolean;
}): Promise<void> {
  const { id, orgId, clientId, e164, label = 'Mobile', verified = false } = params;
  await prisma.$executeRaw`
    INSERT INTO "ClientContact" (id, "orgId", "clientId", e164, label, verified, "createdAt")
    VALUES (${id}, ${orgId}, ${clientId}, ${e164}, ${label}, ${verified}, NOW())
  `;
}
