import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/business-settings
 * Get business settings (singleton)
 */
export async function GET() {
  try {
    let settings = await prisma.businessSettings.findFirst();
    
    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          businessName: "Snout Services",
          timeZone: "America/New_York",
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Failed to fetch business settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch business settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/business-settings
 * Update business settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get existing settings or create new
    let settings = await prisma.businessSettings.findFirst();
    
    if (settings) {
      settings = await prisma.businessSettings.update({
        where: { id: settings.id },
        data: {
          businessName: body.businessName,
          businessPhone: body.businessPhone,
          businessEmail: body.businessEmail,
          businessAddress: body.businessAddress,
          timeZone: body.timeZone || "America/New_York",
          operatingHours: body.operatingHours ? JSON.stringify(body.operatingHours) : null,
          holidays: body.holidays ? JSON.stringify(body.holidays) : null,
          taxSettings: body.taxSettings ? JSON.stringify(body.taxSettings) : null,
          contentBlocks: body.contentBlocks ? JSON.stringify(body.contentBlocks) : null,
        },
      });
    } else {
      settings = await prisma.businessSettings.create({
        data: {
          businessName: body.businessName || "Snout Services",
          businessPhone: body.businessPhone,
          businessEmail: body.businessEmail,
          businessAddress: body.businessAddress,
          timeZone: body.timeZone || "America/New_York",
          operatingHours: body.operatingHours ? JSON.stringify(body.operatingHours) : null,
          holidays: body.holidays ? JSON.stringify(body.holidays) : null,
          taxSettings: body.taxSettings ? JSON.stringify(body.taxSettings) : null,
          contentBlocks: body.contentBlocks ? JSON.stringify(body.contentBlocks) : null,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Failed to update business settings:", error);
    return NextResponse.json(
      { error: "Failed to update business settings" },
      { status: 500 }
    );
  }
}


