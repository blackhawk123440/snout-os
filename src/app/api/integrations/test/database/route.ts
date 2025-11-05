import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Check if database URL is configured
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json({
        working: false,
        status: "not_configured",
        message: "Database URL is not configured. Please add DATABASE_URL to your environment variables.",
      });
    }

    // Test database connection by trying to query
    try {
      await prisma.$connect();
      
      // Try a simple query
      await prisma.booking.findFirst({
        take: 1,
      });
      
      // Check if tables exist by querying settings
      const settingCount = await prisma.setting.count();
      
      return NextResponse.json({
        working: true,
        status: "working",
        message: "Database is connected and working correctly! ✅",
        details: {
          databaseUrlConfigured: !!databaseUrl,
          connectionSuccessful: true,
          settingsCount: settingCount,
        },
      });
    } catch (dbError: any) {
      return NextResponse.json({
        working: false,
        status: "error",
        message: `Database connection error: ${dbError.message || "Unknown error"}`,
        details: {
          databaseUrlConfigured: !!databaseUrl,
          error: dbError.message,
          code: dbError.code,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      working: false,
      status: "error",
      message: `Failed to test database: ${error.message || "Unknown error"}`,
    }, { status: 500 });
  }
}
















