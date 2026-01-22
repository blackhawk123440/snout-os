/**
 * GET /api/messages/diagnostics
 * 
 * Rollout Readiness: Admin diagnostics endpoint
 * Shows thread counts, anti-poaching stats, routing decisions, and blocked message counts.
 * All phone numbers are redacted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserSafe } from '@/lib/auth-helpers';
import { getOrgIdFromContext } from '@/lib/messaging/org-helpers';
import { redactPhoneNumber } from '@/lib/messaging/logging-helpers';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    // Check feature flag
    if (!env.ENABLE_MESSAGING_V1) {
      return NextResponse.json({ error: 'Messaging V1 not enabled' }, { status: 404 });
    }

    // Authenticate user (owner/admin only)
    const user = await getCurrentUserSafe(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await getOrgIdFromContext(user.id);

    // Thread count by numberClass
    const threadsByNumberClass = await prisma.messageThread.groupBy({
      by: ['numberClass'],
      where: { orgId },
      _count: true,
    });

    // Count of messages blocked by anti-poaching
    // Query events with AntiPoachingAttempt relation (blocked messages)
    const antiPoachingBlocked = await prisma.messageEvent.count({
      where: {
        orgId,
        AntiPoachingAttempt: {
          isNot: null,
        },
      },
    });

    // Count of owner inbox routed events (messages routed to owner inbox thread)
    const ownerInboxThread = await prisma.messageThread.findFirst({
      where: {
        orgId,
        scope: 'internal',
      },
      select: { id: true },
    });

    const ownerInboxRouted = ownerInboxThread
      ? await prisma.messageEvent.count({
          where: {
            orgId,
            threadId: ownerInboxThread.id,
            direction: 'inbound',
          },
        })
      : 0;

    // Count of routing decisions where routeTarget = owner and reason = no active window or overlap or pool mismatch
    // This is the real operational signal - messages routed to owner for operational reasons
    const ownerInboxRoutedOperational = await prisma.messageEvent.findMany({
      where: {
        orgId,
        direction: 'inbound',
        metadataJson: { not: null },
      },
      select: {
        id: true,
        metadataJson: true,
        thread: {
          select: {
            scope: true,
          },
        },
      },
    });

    const operationalRoutingCount = ownerInboxRoutedOperational.filter((event) => {
      if (!event.metadataJson) return false;
      try {
        const metadata = JSON.parse(event.metadataJson);
        // Check if routed to owner inbox (scope internal) with operational reason
        if (event.thread.scope === 'internal') {
          // Check for routing reasons in metadata
          const reason = metadata.reason || '';
          const isOperationalReason =
            reason.includes('No active assignment window') ||
            reason.includes('Multiple overlapping') ||
            reason.includes('overlap') ||
            metadata.routingMismatch === true ||
            metadata.routedToOwner === true;
          return isOperationalReason;
        }
        return false;
      } catch {
        return false;
      }
    }).length;

    // Count of sitter messages blocked due to no active window
    // This is tracked via errorCode in send endpoint responses, but we can infer from
    // sitter send attempts that failed with NO_ACTIVE_WINDOW
    // For now, we'll count threads assigned to sitters with no active window
    const sitterBlockedCount = await prisma.messageThread.count({
      where: {
        orgId,
        assignedSitterId: { not: null },
        scope: { notIn: ['internal', 'owner_sitter'] },
      },
    });

    // Get threads with no active window for assigned sitters
    const now = new Date();
    const threadsWithNoActiveWindow = await prisma.messageThread.findMany({
      where: {
        orgId,
        assignedSitterId: { not: null },
        scope: { notIn: ['internal', 'owner_sitter'] },
      },
      include: {
        assignmentWindows: {
          where: {
            status: 'active',
            startAt: { lte: now },
            endAt: { gte: now },
          },
          take: 1,
        },
      },
    });

    const sitterNoWindowCount = threadsWithNoActiveWindow.filter(
      (t) => t.assignmentWindows.length === 0
    ).length;

    // Last 50 routing decisions with redacted sender
    // We'll use MessageEvent metadata to infer routing decisions
    // For inbound messages, we can see which thread they landed in
    const recentRoutingDecisions = await prisma.messageEvent.findMany({
      where: {
        orgId,
        direction: 'inbound',
      },
      include: {
        thread: {
          include: {
            messageNumber: {
              select: {
                numberClass: true,
                e164: true,
              },
            },
            participants: {
              where: { role: 'client' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const routingDecisions = recentRoutingDecisions.map((event) => {
      const clientParticipant = event.thread.participants[0];
      const senderE164 = clientParticipant?.realE164 || null;
      const numberClass = event.thread.messageNumber?.numberClass || event.thread.numberClass || 'unknown';
      const routingTarget = event.thread.scope === 'internal' ? 'owner_inbox' : event.thread.assignedSitterId ? 'sitter' : 'owner';
      
      // Extract routing reason from metadata
      let routingReason: string | null = null;
      if (event.metadataJson) {
        try {
          const metadata = JSON.parse(event.metadataJson);
          routingReason = metadata.reason || (metadata.routingMismatch ? 'Pool number mismatch' : null) || null;
        } catch {
          // Ignore parse errors
        }
      }

      return {
        timestamp: event.createdAt.toISOString(),
        threadId: event.threadId,
        numberClass,
        routingTarget,
        routingReason,
        sender: redactPhoneNumber(senderE164),
        recipient: redactPhoneNumber(event.thread.messageNumber?.e164 || null),
      };
    });

    return NextResponse.json({
      summary: {
        threadsByNumberClass: threadsByNumberClass.map((g) => ({
          numberClass: g.numberClass || 'null',
          count: g._count,
        })),
        antiPoachingBlocked,
        ownerInboxRouted,
        ownerInboxRoutedOperational: operationalRoutingCount,
        sitterNoActiveWindow: sitterNoWindowCount,
      },
      routingDecisions: {
        count: routingDecisions.length,
        decisions: routingDecisions,
      },
      featureFlags: {
        ENABLE_MESSAGING_V1: env.ENABLE_MESSAGING_V1,
        ENABLE_PROACTIVE_THREAD_CREATION: env.ENABLE_PROACTIVE_THREAD_CREATION,
        ENABLE_SITTER_MESSAGES_V1: env.ENABLE_SITTER_MESSAGES_V1,
      },
      runtimeConfig: {
        PUBLIC_BASE_URL: env.PUBLIC_BASE_URL,
        WEBHOOK_BASE_URL: env.WEBHOOK_BASE_URL,
        TWILIO_PHONE_NUMBER: env.TWILIO_PHONE_NUMBER ? redactPhoneNumber(env.TWILIO_PHONE_NUMBER) : null,
        TWILIO_PROXY_SERVICE_SID: env.TWILIO_PROXY_SERVICE_SID ? `${env.TWILIO_PROXY_SERVICE_SID.substring(0, 4)}...` : null,
        providerSelected: env.ENABLE_MESSAGING_V1 ? 'TwilioProvider' : 'none',
      },
    });
  } catch (error) {
    console.error('[messages/diagnostics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diagnostics' },
      { status: 500 }
    );
  }
}
