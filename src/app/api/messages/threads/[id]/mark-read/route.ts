/**
 * Mark Thread as Read Route
 * 
 * PATCH /api/messages/threads/[id]/mark-read
 * Proxies to NestJS API to mark a thread as read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { prisma } from '@/lib/db';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const threadId = params.id;

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';

  // If API_BASE_URL is set, proxy to NestJS API
  if (API_BASE_URL) {
    let apiToken: string;
    try {
      apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to mint API JWT:', error);
      return NextResponse.json(
        { error: 'Failed to authenticate with API' },
        { status: 500 }
      );
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}/mark-read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return NextResponse.json(
          { error: errorData.error || 'Failed to mark thread as read' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error: any) {
      console.error('[BFF Proxy] Error marking thread as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark thread as read' },
        { status: 500 }
      );
    }
  }

  // Fallback: Direct Prisma implementation
  try {
    // Update thread's ownerUnreadCount to 0
    await (prisma as any).thread.update({
      where: {
        id: threadId,
        orgId,
      },
      data: {
        ownerUnreadCount: 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Direct Prisma] Error marking thread as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark thread as read', details: error.message },
      { status: 500 }
    );
  }
}
