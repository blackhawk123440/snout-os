/**
 * Masked Number System
 * 
 * Provides masked phone numbers for privacy:
 * - Clients and sitters see masked numbers, not real numbers
 * - Owner sees all real numbers
 * - Sitters can send messages from personal phones via masked routing
 */

import { prisma } from "@/lib/db";

/**
 * Generate a masked phone number for display
 * Format: +1 (XXX) XXX-XXXX -> +1 (XXX) XXX-XXXX (masked)
 * Or: +1XXXXXXXXXX -> +1 (XXX) XXX-XXXX (masked)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  
  // If it's a US number (11 digits starting with 1), format it
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.substring(1, 4);
    const exchange = digits.substring(4, 7);
    const number = digits.substring(7, 11);
    return `+1 (${area}) XXX-XXXX`;
  }
  
  // For other formats, show first 3 and last 2 digits
  if (digits.length >= 5) {
    const first = digits.substring(0, 3);
    const last = digits.substring(digits.length - 2);
    return `+${first}...${last}`;
  }
  
  // Fallback: show as masked
  return "***-***-****";
}

/**
 * Get the real phone number (owner only)
 * Returns the actual phone number without masking
 */
export function getRealPhoneNumber(phone: string): string {
  return phone;
}

/**
 * Get masked number for a conversation participant
 * @param phone - Real phone number
 * @param viewerRole - 'owner' | 'sitter' | 'client'
 * @returns Masked or real phone number based on viewer role
 */
export function getPhoneForViewer(phone: string, viewerRole: 'owner' | 'sitter' | 'client'): string {
  if (viewerRole === 'owner') {
    return getRealPhoneNumber(phone);
  }
  return maskPhoneNumber(phone);
}

/**
 * Get or create a masked number mapping for a sitter
 * This allows sitters to send messages from their personal phone
 * via a masked OpenPhone number
 */
export async function getSitterMaskedNumber(sitterId: string): Promise<string | null> {
  try {
    const sitter = await prisma.sitter.findUnique({
      where: { id: sitterId },
      select: { openphonePhone: true, personalPhone: true },
    });

    if (!sitter) return null;

    // If sitter has an OpenPhone number configured, use that as their "masked" number
    // This is the number they'll use to send messages
    if (sitter.openphonePhone) {
      return sitter.openphonePhone;
    }

    // If no OpenPhone number, we need to create one or return null
    // In production, this would create a new OpenPhone number for the sitter
    return null;
  } catch (error) {
    console.error("[getSitterMaskedNumber] Error:", error);
    return null;
  }
}

/**
 * Get the real phone number for a booking participant
 * Used internally by the system to route messages
 */
export async function getBookingParticipantPhone(
  bookingId: string,
  participantType: 'client' | 'sitter'
): Promise<string | null> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        sitter: true,
        client: true,
      },
    });

    if (!booking) return null;

    if (participantType === 'client') {
      return booking.phone;
    }

    if (participantType === 'sitter' && booking.sitter) {
      // Prefer OpenPhone number, fallback to personal phone
      return booking.sitter.openphonePhone || booking.sitter.personalPhone || booking.sitter.phone;
    }

    return null;
  } catch (error) {
    console.error("[getBookingParticipantPhone] Error:", error);
    return null;
  }
}


