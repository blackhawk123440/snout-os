/**
 * Unified message sending utilities
 * Centralizes SMS sending logic to eliminate duplication
 */

import { sendSMSFromOpenPhone, sendSMS } from "@/lib/openphone";
import { getOwnerOpenPhoneNumberId } from "@/lib/phone-utils";
import { formatPhoneForAPI } from "@/lib/phone-format";
import { prisma } from "@/lib/db";

/**
 * Send SMS message using the appropriate method (OpenPhone or fallback)
 * @param to - Recipient phone number (will be formatted automatically)
 * @param message - Message content
 * @param bookingId - Optional booking ID for logging
 * @returns Promise<boolean> - True if sent successfully
 */
export async function sendMessage(
  to: string | null | undefined,
  message: string,
  bookingId?: string
): Promise<boolean> {
  try {
    if (!to || !message) {
      console.error("[sendMessage] Missing required parameters: to or message");
      return false;
    }

    const ownerOpenPhoneNumberId = await getOwnerOpenPhoneNumberId();
    // Format phone number for API use (E.164 format)
    const formattedPhone = formatPhoneForAPI(to);
    
    if (!formattedPhone) {
      console.error(`[sendMessage] Invalid phone number: ${to}`);
      return false;
    }
    
    console.log(`[sendMessage] Attempting to send message to ${formattedPhone}`);
    console.log(`[sendMessage] Owner OpenPhone Number ID: ${ownerOpenPhoneNumberId || 'Not configured'}`);
    console.log(`[sendMessage] Message length: ${message.length} characters`);
    
    let sent = false;
    if (ownerOpenPhoneNumberId) {
      console.log(`[sendMessage] Using OpenPhone number ${ownerOpenPhoneNumberId}`);
      sent = await sendSMSFromOpenPhone(ownerOpenPhoneNumberId, formattedPhone, message);
    } else {
      console.log(`[sendMessage] Falling back to default OpenPhone number`);
      sent = await sendSMS(formattedPhone, message);
    }
    
    console.log(`[sendMessage] Message send result: ${sent ? 'SUCCESS' : 'FAILED'}`);
    
    // Note: Message model in API schema doesn't have bookingId, from, to, or status fields
    // Messages are created via the API's messaging service with proper thread associations
    // Database logging disabled for messaging dashboard schema compatibility
    if (bookingId) {
      console.log(`[sendMessage] Would log message for booking ${bookingId}, but Message model doesn't support bookingId in messaging dashboard schema`);
    }
    
    return sent;
  } catch (error) {
    console.error(`[sendMessage] Failed to send message to ${to}:`, error);
    return false;
  }
}
















