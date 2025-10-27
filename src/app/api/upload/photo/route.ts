import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // In a real implementation, you would upload to a cloud storage service
    // For now, we'll just return a mock URL
    const mockUrl = `https://example.com/uploads/${Date.now()}-${file.name}`;

    return NextResponse.json({
      success: true,
      url: mockUrl,
      filename: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("Failed to upload photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}