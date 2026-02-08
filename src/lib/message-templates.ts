/**
 * Message template versioning system
 * Stores templates with version metadata for safe updates
 */

import { prisma } from "@/lib/db";

export interface MessageTemplateVersion {
  version: string;
  template: string;
  description?: string;
  variables: string[];
  channel: "sms" | "email";
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  currentVersion: string;
  versions: MessageTemplateVersion[];
  channel: "sms" | "email";
  category: string;
}

/**
 * Get message template with version history
 */
export async function getMessageTemplateWithHistory(
  automationType: string,
  recipient: "client" | "sitter" | "owner"
): Promise<MessageTemplate | null> {
  const key = `messageTemplate.${automationType}.${recipient}`;
  
  // Note: API schema doesn't have Setting model - templates stored in Automation.templates JSON
  // Return null to use defaults
  return null;
  
  /* Original code (commented out - Setting model not in API schema):
  const current = await prisma.setting.findUnique({
    where: { key },
  });

  if (!current) {
    return null;
  }

  const versionKey = `messageTemplateVersion.${automationType}.${recipient}`;
  const versionData = await prisma.setting.findUnique({
    where: { key: versionKey },
  });

  let versions: MessageTemplateVersion[] = [];
  if (versionData) {
    try {
      versions = JSON.parse(versionData.value);
    } catch {
      versions = [];
    }
  }

  // Extract variables from template
  const variables = extractVariables(current.value);

  return {
    id: key,
    name: `${automationType} - ${recipient}`,
    description: `Message template for ${automationType} sent to ${recipient}`,
    currentVersion: versions.length > 0 ? versions[0].version : "1.0.0",
    versions,
    channel: "sms",
    category: automationType,
  };
}

/**
 * Save message template with versioning
 */
export async function saveMessageTemplateWithVersion(
  automationType: string,
  recipient: "client" | "sitter" | "owner",
  template: string,
  description?: string
): Promise<void> {
  const key = `messageTemplate.${automationType}.${recipient}`;
  const versionKey = `messageTemplateVersion.${automationType}.${recipient}`;

  // Get current template
  const current = await prisma.setting.findUnique({
    where: { key },
  });

  // Get version history
  const versionData = await prisma.setting.findUnique({
    where: { key: versionKey },
  });

  let versions: MessageTemplateVersion[] = [];
  if (versionData) {
    try {
      versions = JSON.parse(versionData.value);
    } catch {
      versions = [];
    }
  }

  // Only create new version if template changed
  if (!current || current.value !== template) {
    const newVersion: MessageTemplateVersion = {
      version: generateVersion(versions),
      template,
      description,
      variables: extractVariables(template),
      channel: "sms",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add new version to front of array
    versions.unshift(newVersion);

    // Keep only last 10 versions
    if (versions.length > 10) {
      versions = versions.slice(0, 10);
    }

    // Note: Setting model not in API schema - disabled
    // await prisma.setting.upsert({ ... });
  }

  // Note: Setting model not in API schema - disabled
  // await prisma.setting.upsert({ ... });
      category: "messageTemplate",
      label: `${automationType} ${recipient} Message Template`,
    },
  });
}

/**
 * Extract variables from template string
 */
function extractVariables(template: string): string[] {
  const variables = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1]);
  }
  return Array.from(variables).sort();
}

/**
 * Generate next version number
 */
function generateVersion(versions: MessageTemplateVersion[]): string {
  if (versions.length === 0) {
    return "1.0.0";
  }

  const latest = versions[0];
  const [major, minor, patch] = latest.version.split(".").map(Number);
  
  // Increment patch version
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Get template version history
 */
export async function getTemplateVersionHistory(
  automationType: string,
  recipient: "client" | "sitter" | "owner"
): Promise<MessageTemplateVersion[]> {
  const versionKey = `messageTemplateVersion.${automationType}.${recipient}`;
  const versionData = await prisma.setting.findUnique({
    where: { key: versionKey },
  });

  if (!versionData) {
    return [];
  }

  try {
    return JSON.parse(versionData.value);
  } catch {
    return [];
  }
}

/**
 * Restore template from version
 */
export async function restoreTemplateFromVersion(
  automationType: string,
  recipient: "client" | "sitter" | "owner",
  version: string
): Promise<boolean> {
  const versions = await getTemplateVersionHistory(automationType, recipient);
  const targetVersion = versions.find(v => v.version === version);

  if (!targetVersion) {
    return false;
  }

  // Save as new version (restore creates new version)
  await saveMessageTemplateWithVersion(
    automationType,
    recipient,
    targetVersion.template,
    `Restored from version ${version}`
  );

  return true;
}

