/**
 * Sitter Tiers Route
 * 
 * Stub endpoint for sitter tiers functionality
 * Returns empty array until backend implementation is complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Get NextAuth session
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Return empty tiers array (stub until backend is implemented)
  return NextResponse.json({ tiers: [] }, { status: 200 });
}
