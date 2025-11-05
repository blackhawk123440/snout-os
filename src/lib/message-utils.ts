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
    
    // Log message in database if bookingId provided
    if (bookingId) {
      try {
        await prisma.message.create({
          data: {
            direction: "outbound",
            body: message,
            status: sent ? "sent" : "failed",
            bookingId,
            from: "system",
            to: formattedPhone,
          },
        });
      } catch (dbError) {
        console.error("[sendMessage] Failed to log message to database:", dbError);
        // Don't fail the send if database logging fails
      }
    }
    
    return sent;
  } catch (error) {
    console.error(`[sendMessage] Failed to send message to ${to}:`, error);
    return false;
  }
}
















