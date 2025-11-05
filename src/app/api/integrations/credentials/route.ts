import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Credential key is required" },
        { status: 400 }
      );
    }

    // Store credential in database settings
    // Note: These should also be set as environment variables for production
    await prisma.setting.upsert({
      where: { key: `integration.${key}` },
      update: {
        value: value || "",
        updatedAt: new Date(),
      },
      create: {
        key: `integration.${key}`,
        value: value || "",
        category: "integration",
        label: `Integration: ${key}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Credential saved successfully",
      note: "Remember to also set this as an environment variable for production use.",
    });
  } catch (error: any) {
    console.error("Failed to save credential:", error);
    return NextResponse.json(
      { error: "Failed to save credential" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      // Get specific credential
      const setting = await prisma.setting.findUnique({
        where: { key: `integration.${key}` },
      });

      return NextResponse.json({
        key,
        value: setting?.value || null,
        fromEnv: !!process.env[key],
      });
    } else {
      // Get all integration credentials
      const settings = await prisma.setting.findMany({
        where: {
          key: {
            startsWith: "integration.",
          },
        },
      });

      const credentials: Record<string, string> = {};
      settings.forEach(setting => {
        const key = setting.key.replace("integration.", "");
        credentials[key] = setting.value;
      });

      return NextResponse.json({ credentials });
    }
  } catch (error: any) {
    console.error("Failed to fetch credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}
















