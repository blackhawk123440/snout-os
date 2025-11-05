import { NextRequest, NextResponse } from "next/server";
import { restoreTemplateFromVersion } from "@/lib/message-templates";

/**
 * Restore message template from a specific version
 * POST /api/message-templates/restore
 * Body: { automationType, recipient, version }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { automationType, recipient, version } = body;

    if (!automationType || !recipient || !version) {
      return NextResponse.json(
        { error: "Missing required fields: automationType, recipient, and version" },
        { status: 400 }
      );
    }

    if (!["client", "sitter", "owner"].includes(recipient)) {
      return NextResponse.json(
        { error: "Invalid recipient. Must be 'client', 'sitter', or 'owner'" },
        { status: 400 }
      );
    }

    const success = await restoreTemplateFromVersion(automationType, recipient, version);

    if (!success) {
      return NextResponse.json(
        { error: "Version not found or restore failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Template restored from version ${version}`,
    });
  } catch (error) {
    console.error("Failed to restore template:", error);
    return NextResponse.json(
      { error: "Failed to restore template" },
      { status: 500 }
    );
  }
}

