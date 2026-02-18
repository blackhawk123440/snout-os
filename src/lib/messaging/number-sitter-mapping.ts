/**
 * Number to Sitter Mapping
 * 
 * Maps Twilio phone numbers to sitter IDs for webhook routing.
 */

import { prisma } from '@/lib/db';

/**
 * Get sitter ID from Twilio phone number (E.164 format)
 * 
 * Looks up MessageNumber record and returns assignedSitterId if number is assigned to a sitter.
 * 
 * @param toNumberE164 - The "to" phone number in E.164 format (e.g., +15551234567)
 * @returns Sitter ID if number is assigned to a sitter, null otherwise
 */
export async function getSitterIdFromNumber(toNumberE164: string): Promise<string | null> {
  const messageNumber = await (prisma as any).messageNumber.findFirst({
    where: {
      e164: toNumberE164,
      status: 'active',
    },
    select: {
      assignedSitterId: true,
      numberClass: true,
    },
  });

  if (!messageNumber) {
    return null;
  }

  // Only return sitterId if number class is 'sitter'
  if (messageNumber.numberClass === 'sitter' && messageNumber.assignedSitterId) {
    return messageNumber.assignedSitterId;
  }

  return null;
}

/**
 * Get sitter ID from masked number via SitterMaskedNumber
 * 
 * Alternative lookup path for sitter-assigned numbers.
 */
export async function getSitterIdFromMaskedNumber(toNumberE164: string): Promise<string | null> {
  // First try MessageNumber lookup
  const sitterId = await getSitterIdFromNumber(toNumberE164);
  if (sitterId) {
    return sitterId;
  }

  // Fallback: Check SitterMaskedNumber via MessageNumber relation
  const messageNumber = await (prisma as any).messageNumber.findFirst({
    where: {
      e164: toNumberE164,
      status: 'active',
    },
    select: {
      id: true,
    },
  });

  if (!messageNumber) {
    return null;
  }

  const sitterMaskedNumber = await (prisma as any).sitterMaskedNumber.findFirst({
    where: {
      messageNumberId: messageNumber.id,
      status: 'active',
    },
    select: {
      sitterId: true,
    },
  });

  return sitterMaskedNumber?.sitterId || null;
}
