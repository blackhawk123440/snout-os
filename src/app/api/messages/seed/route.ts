/**
 * Seed Messaging Data API Route
 * 
 * Dev-only endpoint to seed messaging data for local development.
 * POST /api/messages/seed
 * 
 * NOTE: This route requires messaging schema models that may not exist
 * in the root Prisma schema. It's only functional when using the
 * enterprise-messaging-dashboard schema.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Return early if messaging schema is not available
  // This prevents TypeScript errors during build
  return NextResponse.json(
    { 
      error: "Messaging seed endpoint is not available in this build. Use the messaging dashboard API instead.",
      available: false 
    },
    { status: 503 }
  );
}
