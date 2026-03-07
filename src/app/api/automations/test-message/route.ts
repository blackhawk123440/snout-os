/**
 * POST /api/automations/test-message
 * Send a test SMS for automation template preview. Owner/admin only.
 * Body: { template: string, phoneNumber: string, recipientType?: 'client' | 'sitter' | 'owner' }
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { requireOwnerOrAdmin, ForbiddenError } from "@/lib/rbac";
import { sendMessage } from "@/lib/message-utils";
import { formatPhoneForAPI } from "@/lib/phone-format";

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      template?: string;
      phoneNumber?: string;
      recipientType?: "client" | "sitter" | "owner";
    };
    const template = typeof body.template === "string" ? body.template.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template is required" },
        { status: 400 }
      );
    }
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const formatted = formatPhoneForAPI(phoneNumber);
    if (!formatted) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    const sent = await sendMessage(formatted, template);
    if (!sent) {
      return NextResponse.json(
        { success: false, error: "Failed to send test message" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to send test message", message },
      { status: 500 }
    );
  }
}
