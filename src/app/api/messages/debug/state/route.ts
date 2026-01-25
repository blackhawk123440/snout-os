/**
 * Debug Endpoint for Message Thread State
 * 
 * Owner-only endpoint to inspect thread state for QA/debugging.
 * HARDENED: Only available when:
 * - ENABLE_DEBUG_ENDPOINTS=true
 * - NODE_ENV !== "production" OR request host is in DEBUG_ALLOWED_HOSTS
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  // Hardened safety checks
  if (!env.ENABLE_DEBUG_ENDPOINTS) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Block in production unless explicitly allowed
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const allowedHosts = process.env.DEBUG_ALLOWED_HOSTS?.split(',').map(h => h.trim()) || [];
    const requestHost = request.headers.get('host') || '';
    
    if (!allowedHosts.includes(requestHost) && !allowedHosts.includes('*')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  // Require authentication and owner role
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get orgId from user or default
  const orgId = (session.user as any).orgId || 'default';
  const userRole = (session.user as any).role || 'sitter';

  // Only owners can access debug endpoints
  if (userRole !== 'owner' && userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get threadId from query params
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('threadId');

  if (!threadId) {
    return NextResponse.json({ error: 'threadId query parameter required' }, { status: 400 });
  }

  try {
    // Fetch thread with participants
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId, orgId },
      include: {
        participants: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Fetch messages separately
    const messages = await prisma.messageEvent.findMany({
      where: { threadId, orgId },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch assignment windows separately
    const assignmentWindows = await prisma.assignmentWindow.findMany({
      where: {
        threadId,
        orgId,
        status: 'active',
      },
      include: {
        sitter: {
          include: { user: true },
        },
      },
    });

    // Fetch audit events
    const auditEvents = await (prisma as any).messagingAuditEvent?.findMany({
      where: { threadId, orgId },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }) || [];

    // Fetch policy violations
    const violations = await (prisma as any).messagePolicyViolation?.findMany({
      where: { threadId, orgId },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        senderUser: {
          select: { id: true, email: true, name: true },
        },
      },
    }) || [];

    return NextResponse.json({
      thread: {
        id: thread.id,
        orgId: thread.orgId,
        scope: thread.scope,
        bookingId: thread.bookingId,
        assignedSitterId: thread.assignedSitterId,
        status: thread.status,
        messageNumberId: thread.messageNumberId,
      },
      participants: thread.participants.map((p: any) => ({
        id: p.id,
        role: p.role,
        userId: p.userId,
        clientId: p.clientId,
      })),
      assignmentWindows: assignmentWindows.map((w: any) => ({
        id: w.id,
        startAt: w.startAt,
        endAt: w.endAt,
        status: w.status,
        sitter: w.sitter ? {
          id: w.sitter.id,
          name: w.sitter.user?.name,
        } : null,
      })),
      messages: messages.map((e: any) => ({
        id: e.id,
        direction: e.direction,
        body: e.body,
        deliveryStatus: e.deliveryStatus,
        createdAt: e.createdAt,
        providerMessageSid: e.providerMessageSid,
      })),
      auditEvents,
      violations,
    });
  } catch (error: any) {
    console.error('[DebugEndpoint] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
