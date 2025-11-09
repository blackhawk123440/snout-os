import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveMessageTemplateWithVersion } from "@/lib/message-templates";

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

    // Update automation settings if provided
    if (body.automation) {
      await prisma.setting.upsert({
        where: { key: "automation" },
        update: { 
          value: JSON.stringify(body.automation),
          updatedAt: new Date(),
        },
        create: {
          key: "automation",
          value: JSON.stringify(body.automation),
          category: "automation",
          label: "Automation Settings",
        },
      });
      
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
          if (config.messageTemplateClient) {
            await saveMessageTemplateWithVersion(
              automationType,
              "client",
              config.messageTemplateClient,
              `Client message template for ${automationType}`
            );
          }
          
          // Store sitter message template with versioning
          if (config.messageTemplateSitter) {
            await saveMessageTemplateWithVersion(
              automationType,
              "sitter",
              config.messageTemplateSitter,
              `Sitter message template for ${automationType}`
            );
          }
          
          // Store owner message template with versioning
          if (config.messageTemplateOwner) {
            await saveMessageTemplateWithVersion(
              automationType,
              "owner",
              config.messageTemplateOwner,
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

    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
