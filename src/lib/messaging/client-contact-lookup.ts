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
 * Find a ClientContact by orgId and e164. Uses $queryRawUnsafe so Prisma never
 * rewrites column names (generated client can reference "orgld" instead of "orgId").
 */
export async function findClientContactByPhone(
  orgId: string,
  e164: string
): Promise<ClientContactRow | null> {
  const rows = await prisma.$queryRawUnsafe<ClientContactRow[]>(
    'SELECT id, "orgId", "clientId", e164, label, verified FROM "ClientContact" WHERE "orgId" = $1 AND e164 = $2 LIMIT 1',
    orgId,
    e164
  );
  return rows[0] ?? null;
}

/**
 * Get the first E.164 for a client (by orgId + clientId). Uses raw SQL to avoid ClientContact.orgld.
 */
export async function getClientE164ForClient(
  orgId: string,
  clientId: string
): Promise<string | null> {
  const rows = await prisma.$queryRawUnsafe<{ e164: string }[]>(
    'SELECT e164 FROM "ClientContact" WHERE "orgId" = $1 AND "clientId" = $2 LIMIT 1',
    orgId,
    clientId
  );
  return rows[0]?.e164 ?? null;
}

/**
 * Insert a ClientContact. Uses $executeRawUnsafe so the "orgId" column is used
 * and Prisma does not rewrite to "orgld".
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
  await prisma.$executeRawUnsafe(
    'INSERT INTO "ClientContact" (id, "orgId", "clientId", e164, label, verified, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    id,
    orgId,
    clientId,
    e164,
    label,
    verified
  );
}
