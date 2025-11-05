import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // TODO: Implement Google Calendar integration test
    return NextResponse.json({
      success: false,
      error: "Google Calendar integration not yet implemented",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to test Google Calendar integration" },
      { status: 500 }
    );
  }
}
