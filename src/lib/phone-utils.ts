/**
 * Helper functions for phone number management
 */

import { prisma } from "@/lib/db";
import { getAutomationSettings } from "@/lib/automation-utils";

/**
 * Get the appropriate phone number for a sitter based on their phone type preference or automation settings
 */
export async function getSitterPhone(
  sitterId: string,
  phoneType?: "personal" | "openphone",
  automationType?: string // e.g., "sitterPoolOffers", "nightBeforeReminder", etc.
): Promise<string | null> {
  // Note: API schema Sitter model only has: id, orgId, userId, name, active, createdAt, updatedAt
  // Phone fields don't exist - return null or use environment variables
  // Note: Sitter model has 'name' field but Prisma types may not reflect it
  // API schema doesn't have phone fields on Sitter model
  // Return null - phone numbers would need to be stored elsewhere
  return null;
}

/**
 * Get the appropriate phone number for the owner based on phone type preference or automation settings
 */
export async function getOwnerPhone(
  phoneType?: "personal" | "openphone",
  automationType?: string // e.g., "ownerNewBookingAlert", "sitterPoolOffers", "dailySummary", etc.
): Promise<string | null> {
  // If phoneType is provided, use it
  let preferredType = phoneType;

  if (!preferredType && automationType) {
    try {
      const automationSettings = await getAutomationSettings();
      const automationConfig = automationSettings[automationType];
      if (automationConfig?.ownerPhoneType) {
        preferredType = automationConfig.ownerPhoneType;
      }
    } catch (error) {
      console.error("Error getting automation settings for owner phone:", error);
    }
  }

  // Note: Setting model not available in API schema
  // Use environment variables instead
  const ownerPersonalPhone = process.env.OWNER_PERSONAL_PHONE || null;
  const ownerOpenphonePhone = process.env.OWNER_OPENPHONE_PHONE || null;
  const defaultPhoneType = process.env.OWNER_PHONE_TYPE || "personal";

  if (!preferredType) {
    preferredType = defaultPhoneType as "personal" | "openphone" | undefined;
  }

  if (preferredType === "openphone" && ownerOpenphonePhone) {
    return ownerOpenphonePhone;
  }

  if (preferredType === "personal" && ownerPersonalPhone) {
    return ownerPersonalPhone;
  }

  return ownerPersonalPhone || ownerOpenphonePhone || process.env.OWNER_PHONE || null;
}

/**
 * Get the owner's OpenPhone number ID (not the phone number, but the OpenPhone number ID)
 */
export async function getOwnerOpenPhoneNumberId(): Promise<string | null> {
  // First check environment variable for OpenPhone number ID
  const envNumberId = process.env.OPENPHONE_NUMBER_ID;
  if (envNumberId) {
    return envNumberId;
  }

  // Note: Setting model not available in API schema
  // Use environment variable only
  return null;
}
















