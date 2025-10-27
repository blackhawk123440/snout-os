import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;
    const bookingId = data.get("bookingId") as string;

    if (!file || !bookingId) {
      return NextResponse.json({ error: "Missing file or booking ID" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const timestamp = Date.now();
    const filename = `${bookingId}-${timestamp}-${file.name}`;
    const path = join(process.cwd(), "public", "uploads", filename);

    // Ensure uploads directory exists
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    await writeFile(path, buffer);

    // Return the public URL
    const url = `/uploads/${filename}`;
    
    return NextResponse.json({ 
      success: true, 
      url,
      filename 
    });

  } catch (error) {
    console.error("Failed to upload photo:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
