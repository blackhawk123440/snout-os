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
 */
export async function getMessageTemplate(
  automationType: string,
  recipient: "client" | "sitter" | "owner" = "client"
): Promise<string | null> {
  // First check individual messageTemplate.* settings (these are updated with versioning)
  // Always read fresh from database - no caching
  // Use findFirst with orderBy to ensure we get the most recent version
  const templateKey = `messageTemplate.${automationType}.${recipient}`;
  const template = await prisma.setting.findUnique({
    where: { key: templateKey },
    // Force fresh read by not using any cache
  });

  if (template) {
    // Return the template value, even if it's an empty string (user might have cleared it)
    // Empty string is a valid template (user might want to disable the message)
    return template.value || null;
  }
  
  // Fallback to automation settings JSON object (for backwards compatibility)
  // This should only be used if individual template doesn't exist
  const automationSettings = await getAutomationSettings();
  const automation = automationSettings[automationType];
  
  if (automation && typeof automation === 'object') {
    const fallbackTemplateKey = `messageTemplate${recipient.charAt(0).toUpperCase() + recipient.slice(1)}` as "messageTemplateClient" | "messageTemplateSitter" | "messageTemplateOwner";
    if (automation[fallbackTemplateKey]) {
      return automation[fallbackTemplateKey];
    }
  }

  return null;
}

/**
 * Replace template variables in a message
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  let message = template;
  Object.keys(variables).forEach(key => {
    const value = String(variables[key]);
    message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
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
















