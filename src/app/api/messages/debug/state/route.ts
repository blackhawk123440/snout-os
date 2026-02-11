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
import { getCurrentUserSafe } from '@/lib/auth-helpers';
import { getOrgIdFromContext } from '@/lib/messaging/org-helpers';

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
  const user = await getCurrentUserSafe();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get orgId
  const orgId = await getOrgIdFromContext(user);

  // Only owners can access debug endpoints
  if (user.role !== 'owner' && user.role !== 'admin') {
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
    const thread = await (prisma as any).thread.findUnique({
      where: { id: threadId, orgId },
      include: {
        participants: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Fetch messages separately
    const messages = await (prisma as any).message.findMany({
      where: { threadId, orgId },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch assignment windows separately
    // Note: AssignmentWindow model doesn't have status field
    const assignmentWindows = await (prisma as any).assignmentWindow.findMany({
      where: {
        threadId,
        orgId,
        // status field doesn't exist - filter by time range instead
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() },
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
        threadType: thread.threadType, // Thread model uses threadType, not scope
        // bookingId and assignedSitterId don't exist on Thread model
        status: thread.status,
        numberId: thread.numberId, // Thread model uses numberId, not messageNumberId
      },
      participants: thread.participants.map((p: any) => ({
        id: p.id,
        role: p.role,
        userId: p.userId,
        clientId: p.clientId,
      })),
      assignmentWindows: assignmentWindows.map((w: any) => ({
        id: w.id,
        startsAt: w.startsAt, // Field is startsAt, not startAt
        endsAt: w.endsAt, // Field is endsAt, not endAt
        // status field doesn't exist on AssignmentWindow
        sitter: w.sitter ? {
          id: w.sitter.id,
          name: w.sitter.name, // Sitter model has name directly, not via user relation
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
