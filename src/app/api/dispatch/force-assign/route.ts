/**
 * Force Assign Sitter API
 * 
 * POST: Force assign a sitter to a booking (owner override)
 * Validates dispatch status transitions and records audit events
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { forceAssignSitter } from '@/lib/dispatch-control';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Owner/admin only
  const user = session.user as any;
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { bookingId, sitterId, reason } = body;

    if (!bookingId || !sitterId) {
      return NextResponse.json(
        { error: 'bookingId and sitterId are required' },
        { status: 400 }
      );
    }

    const orgId = user.orgId || (await import('@/lib/messaging/org-helpers')).getDefaultOrgId();

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    await forceAssignSitter(
      orgId,
      bookingId,
      sitterId,
      reason || 'Owner force assignment',
      user.id
    );

    return NextResponse.json({
      success: true,
      message: 'Sitter assigned successfully',
    });
  } catch (error: any) {
    console.error('[Force Assign API] Failed to assign sitter:', error);
    return NextResponse.json(
      { error: 'Failed to assign sitter', message: error.message },
      { status: 400 }
    );
  }
}
