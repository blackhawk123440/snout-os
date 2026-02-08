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
  const sitter = await prisma.sitter.findUnique({
    where: { id: sitterId },
    select: {
      phone: true,
      personalPhone: true,
      openphonePhone: true,
      phoneType: true,
    },
  });

  if (!sitter) {
    return null;
  }

  let preferredType = phoneType;

  if (!preferredType && automationType) {
    try {
      const automationSettings = await getAutomationSettings();
      const automationConfig = automationSettings[automationType];
      if (automationConfig?.sitterPhoneType) {
        preferredType = automationConfig.sitterPhoneType;
      }
    } catch (error) {
      console.error("Error getting automation settings for sitter phone:", error);
    }
  }

  if (!preferredType) {
    preferredType = (sitter.phoneType === "openphone" ? "openphone" : "personal") as "personal" | "openphone";
  }

  if (preferredType === "openphone" && sitter.openphonePhone) {
    return sitter.openphonePhone;
  }

  if (preferredType === "personal" && sitter.personalPhone) {
    return sitter.personalPhone;
  }

  return sitter.phone || sitter.personalPhone || sitter.openphonePhone || null;
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

  const settings = await prisma.setting.findMany({
    where: {
      OR: [
        { key: "ownerPersonalPhone" },
        { key: "ownerOpenphonePhone" },
        { key: "ownerPhoneType" },
      ],
    },
  });

  const settingsObj: Record<string, any> = {};
  settings.forEach((setting) => {
    settingsObj[setting.key] = setting.value;
  });

  const ownerPersonalPhone = settingsObj.ownerPersonalPhone || null;
  const ownerOpenphonePhone = settingsObj.ownerOpenphonePhone || null;
  const defaultPhoneType = settingsObj.ownerPhoneType || "personal";

  if (!preferredType) {
    preferredType = defaultPhoneType;
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

  // Note: API schema doesn't have Setting model - use environment variable
  // Return environment variable directly
  return process.env.OPENPHONE_NUMBER_ID || null;
}
















