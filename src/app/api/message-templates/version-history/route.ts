import { NextRequest, NextResponse } from "next/server";
import { getTemplateVersionHistory } from "@/lib/message-templates";

/**
 * Get message template version history
 * GET /api/message-templates/version-history?automationType=bookingConfirmation&recipient=client
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const automationType = searchParams.get("automationType");
    const recipient = searchParams.get("recipient") as "client" | "sitter" | "owner" | null;

    if (!automationType || !recipient) {
      return NextResponse.json(
        { error: "Missing required parameters: automationType and recipient" },
        { status: 400 }
      );
    }

    if (!["client", "sitter", "owner"].includes(recipient)) {
      return NextResponse.json(
        { error: "Invalid recipient. Must be 'client', 'sitter', or 'owner'" },
        { status: 400 }
      );
    }

    const versions = await getTemplateVersionHistory(automationType, recipient);

    return NextResponse.json({
      automationType,
      recipient,
      versions,
    });
  } catch (error) {
    console.error("Failed to get template version history:", error);
    return NextResponse.json(
      { error: "Failed to get template version history" },
      { status: 500 }
    );
  }
}

