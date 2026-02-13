/**
 * Message Templates Route
 * 
 * Legacy endpoint - returns empty array as templates are not implemented in messaging API.
 * This prevents 404 errors in the frontend.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Return empty array for legacy message-templates endpoint
  // Templates are not part of the messaging dashboard API
  return NextResponse.json([]);
}

export async function POST() {
  // Return success for legacy endpoint
  return NextResponse.json({ success: true, message: 'Templates not implemented' });
}
