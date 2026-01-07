import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveMessageTemplateWithVersion } from "@/lib/message-templates";
// Phase 3: Automation settings persistence helpers
import { 
  calculateAutomationSettingsChecksum, 
  validateAutomationSettings,
  normalizeAutomationSettings 
} from "@/lib/automation-settings-helpers";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    
    // Transform key-value pairs to object structure
    const settingsObj: Record<string, any> = {};
    settings.forEach(setting => {
      // Try to parse JSON values, otherwise use as string
      try {
        settingsObj[setting.key] = JSON.parse(setting.value);
      } catch {
        settingsObj[setting.key] = setting.value;
      }
    });
    
    // Ensure automation object exists
    if (!settingsObj.automation || typeof settingsObj.automation !== 'object') {
      settingsObj.automation = {};
      }
    
    // Load message templates and merge them into automation settings
    const messageTemplateSettings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'messageTemplate.',
        },
      },
    });
    
    messageTemplateSettings.forEach(template => {
      const parts = template.key.split('.');
      if (parts.length === 3) {
        const [prefix, automationType, recipient] = parts;
        if (!settingsObj.automation[automationType]) {
          settingsObj.automation[automationType] = {};
        }
        const templateKey = `messageTemplate${recipient.charAt(0).toUpperCase() + recipient.slice(1)}` as "messageTemplateClient" | "messageTemplateSitter" | "messageTemplateOwner";
        settingsObj.automation[automationType][templateKey] = template.value;
      }
    });
    
    return NextResponse.json({ settings: settingsObj, automation: settingsObj.automation });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Phase 3: Update automation settings with persistence validation
    let savedAutomationSettings: any = null;
    if (body.automation) {
      // Normalize the input settings
      const normalizedAutomation = normalizeAutomationSettings(body.automation);
      
      // Save automation settings
      await prisma.setting.upsert({
        where: { key: "automation" },
        update: { 
          value: JSON.stringify(normalizedAutomation),
          updatedAt: new Date(),
        },
        create: {
          key: "automation",
          value: JSON.stringify(normalizedAutomation),
          category: "automation",
          label: "Automation Settings",
        },
      });
      
      // Phase 3: Re-read from database to confirm persistence (hard requirement per master spec line 255)
      const savedSetting = await prisma.setting.findUnique({
        where: { key: "automation" },
      });
      
      if (!savedSetting) {
        throw new Error("Failed to save automation settings - setting not found after save");
      }
      
      // Parse the saved value
      try {
        savedAutomationSettings = JSON.parse(savedSetting.value);
      } catch (error) {
        throw new Error("Failed to parse saved automation settings");
      }
      
      // Phase 3: Validate checksum to ensure data integrity (hard requirement per master spec line 255)
      const checksumMatches = validateAutomationSettings(savedAutomationSettings, normalizedAutomation);
      if (!checksumMatches) {
        console.error("[Automation Settings] Checksum validation failed after save");
        throw new Error("Automation settings checksum validation failed - data may be corrupted");
      }
      
      const savedChecksum = calculateAutomationSettingsChecksum(savedAutomationSettings);
      console.log(`[Automation Settings] Saved and validated with checksum: ${savedChecksum}`);
      
      // Store message templates separately for easier retrieval
      const automation = body.automation;
      
      // Extract and store message templates for each automation type
      const templateKeys = [
        "bookingConfirmation",
        "ownerNewBookingAlert",
        "nightBeforeReminder",
        "paymentReminder",
        "paymentAndTipLinks",
        "sitterAssignment",
        "postVisitThankYou",
        "visitReport",
        "sitterPoolOffers",
      ];
      
      for (const automationType of templateKeys) {
        if (automation[automationType]) {
          const config = automation[automationType];
          
          // Store client message template with versioning
          // Save even if empty string to ensure updates are persisted
          if (config.hasOwnProperty('messageTemplateClient')) {
            await saveMessageTemplateWithVersion(
              automationType,
              "client",
              config.messageTemplateClient || "",
              `Client message template for ${automationType}`
            );
          }
          
          // Store sitter message template with versioning
          if (config.hasOwnProperty('messageTemplateSitter')) {
            await saveMessageTemplateWithVersion(
              automationType,
              "sitter",
              config.messageTemplateSitter || "",
              `Sitter message template for ${automationType}`
            );
          }
          
          // Store owner message template with versioning
          if (config.hasOwnProperty('messageTemplateOwner')) {
            await saveMessageTemplateWithVersion(
              automationType,
              "owner",
              config.messageTemplateOwner || "",
              `Owner message template for ${automationType}`
            );
          }
        }
      }
    }

    // Update other settings if provided
    const updatePromises = Object.keys(body)
      .filter(key => key !== "automation" && body[key] !== undefined)
      .map(async (key) => {
        const value = typeof body[key] === 'object' ? JSON.stringify(body[key]) : String(body[key]);
        return prisma.setting.upsert({
          where: { key },
          update: { 
            value,
            updatedAt: new Date(),
          },
      create: {
            key,
            value,
            category: "general",
            label: key,
      },
        });
    });

    await Promise.all(updatePromises);

    // Phase 3: Return canonical value (re-read from DB) per master spec line 255
    // Load the canonical automation settings from database
    let canonicalAutomation: any = null;
    if (savedAutomationSettings) {
      // Use the saved settings we already re-read and validated
      canonicalAutomation = savedAutomationSettings;
    } else {
      // Re-read if we didn't save automation settings this time
      const automationSetting = await prisma.setting.findUnique({
        where: { key: "automation" },
      });
      if (automationSetting) {
        try {
          canonicalAutomation = JSON.parse(automationSetting.value);
        } catch {
          canonicalAutomation = {};
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Settings saved successfully",
      // Phase 3: Return canonical automation settings (hard requirement per master spec line 255)
      automation: canonicalAutomation,
    });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
