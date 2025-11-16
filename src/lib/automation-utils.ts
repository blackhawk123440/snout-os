/**
 * Helper functions for automation management
 */

import { prisma } from "@/lib/db";

/**
 * Get automation settings from database
 */
export async function getAutomationSettings(): Promise<Record<string, any>> {
  const automationSetting = await prisma.setting.findUnique({
    where: { key: "automation" },
  });

  if (!automationSetting) {
    return {};
  }

  try {
    return JSON.parse(automationSetting.value);
  } catch {
    return {};
  }
}

/**
 * Get message template from database for a specific automation type and recipient
 * Prioritizes individual messageTemplate.* settings over automation JSON object
 * to ensure latest saved templates are used
 * 
 * IMPORTANT: Always reads fresh from database - NO CACHING
 * This ensures templates update instantly after being saved
 */
export async function getMessageTemplate(
  automationType: string,
  recipient: "client" | "sitter" | "owner" = "client"
): Promise<string | null> {
  // CRITICAL: Always read fresh from database - no caching, no memoization
  // This ensures the newest saved version is used immediately with zero delay
  const templateKey = `messageTemplate.${automationType}.${recipient}`;
  
  // Direct database query - bypasses any potential caching layers
  // Prisma always reads fresh from database by default, but we ensure no application-level caching
  const template = await prisma.setting.findUnique({
    where: { key: templateKey },
  });

  // If template exists in database (even if empty string), return it immediately
  // Empty string means user cleared the template, so we return it (caller should handle default)
  if (template !== null) {
    return template.value || ""; // Return empty string if value is null/undefined
  }
  
  // Fallback to automation settings JSON object (for backwards compatibility)
  // This should only be used if individual template doesn't exist
  // Also read fresh - no caching
  const automationSettings = await getAutomationSettings();
  const automation = automationSettings[automationType];
  
  if (automation && typeof automation === 'object') {
    const fallbackTemplateKey = `messageTemplate${recipient.charAt(0).toUpperCase() + recipient.slice(1)}` as "messageTemplateClient" | "messageTemplateSitter" | "messageTemplateOwner";
    // Check if the key exists (even if value is empty string)
    if (fallbackTemplateKey in automation) {
      return automation[fallbackTemplateKey] || "";
    }
  }

  return null;
}

/**
 * Replace template variables in a message
 * For sitter messages, if totalPrice or total is present and sitterCommissionPercentage is provided,
 * it will be replaced with earnings instead of the full total
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>,
  options?: {
    sitterCommissionPercentage?: number;
    isSitterMessage?: boolean;
  }
): string {
  let message = template;
  
  // If this is a sitter message and commission percentage is provided, calculate earnings for totalPrice/total
  if (options?.isSitterMessage && options?.sitterCommissionPercentage !== undefined) {
    // Get totalPrice from variables (could be number or string)
    let totalPrice: number | null = null;
    if (variables.totalPrice !== undefined) {
      totalPrice = typeof variables.totalPrice === 'number' ? variables.totalPrice : parseFloat(String(variables.totalPrice));
    } else if (variables.total !== undefined) {
      totalPrice = typeof variables.total === 'number' ? variables.total : parseFloat(String(variables.total));
    }
    
    // If we have a valid totalPrice, calculate earnings
    if (totalPrice !== null && !isNaN(totalPrice)) {
      const earnings = (totalPrice * options.sitterCommissionPercentage) / 100;
      // Replace totalPrice and total with earnings for sitter messages
      // Support both {{totalPrice}} and {{ totalPrice }} (with whitespace)
      message = message.replace(/\{\{\s*totalPrice\s*\}\}/g, earnings.toFixed(2));
      message = message.replace(/\{\{\s*total\s*\}\}/g, earnings.toFixed(2));
      // Also support old format
      message = message.replace(/\[TotalPrice\]/gi, earnings.toFixed(2));
      message = message.replace(/\[Total\]/gi, earnings.toFixed(2));
    }
  }
  
  Object.keys(variables).forEach(key => {
    // Skip totalPrice and total if we already handled them for sitter messages
    if (options?.isSitterMessage && (key === 'totalPrice' || key === 'total')) {
      return;
    }
    const value = String(variables[key]);
    // Support both {{key}} and {{ key }} (with whitespace around key)
    message = message.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
    // Also support old format [VariableName]
    const oldKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
    message = message.replace(new RegExp(`\\[${oldKey}\\]`, 'gi'), value);
  });
  return message;
}

/**
 * Check if an automation is enabled
 */
export async function isAutomationEnabled(automationType: string): Promise<boolean> {
  const settings = await getAutomationSettings();
  const automation = settings[automationType];
  
  if (!automation || typeof automation !== 'object') {
    return false;
  }
  
  return automation.enabled === true;
}

/**
 * Check if automation should send to a specific recipient
 */
export async function shouldSendToRecipient(
  automationType: string,
  recipient: 'client' | 'sitter' | 'owner'
): Promise<boolean> {
  if (!(await isAutomationEnabled(automationType))) {
    return false;
  }
  
  const settings = await getAutomationSettings();
  const automation = settings[automationType];
  
  if (!automation || typeof automation !== 'object') {
    return false;
  }
  
  switch (recipient) {
    case 'client':
      return automation.sendToClient === true;
    case 'sitter':
      return automation.sendToSitter === true || automation.sendToSitters === true;
    case 'owner':
      return automation.sendToOwner === true;
    default:
      return false;
  }
}
















