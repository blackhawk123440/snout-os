/**
 * Number to Organization Mapping
 * 
 * Maps Twilio phone numbers to organization IDs for webhook routing.
 * Ensures strict org isolation by deriving orgId ONLY from the "to" number.
 */

import { prisma } from '@/lib/db';
import { NotFoundError } from './errors';

/**
 * Get organization ID from a Twilio phone number (E.164 format)
 * 
 * This function looks up the MessageNumber record for the given phone number
 * and returns its associated orgId.
 * 
 * @param toNumberE164 - The "to" phone number in E.164 format (e.g., +15551234567)
 * @returns Organization ID
 * @throws NotFoundError if the number is not found or inactive
 */
export async function getOrgIdFromNumber(toNumberE164: string): Promise<string> {
  // Find the MessageNumber record for this phone number
  const messageNumber = await prisma.messageNumber.findFirst({
    where: {
      e164: toNumberE164,
      status: 'active',
    },
    select: {
      orgId: true,
    },
  });

  if (!messageNumber) {
    throw new NotFoundError(`Phone number ${toNumberE164} not found or inactive`);
  }

  return messageNumber.orgId;
}
