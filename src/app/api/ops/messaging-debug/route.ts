/**
 * Messaging Debug Endpoint
 * 
 * GET /api/ops/messaging-debug
 * Returns MessageDelivery and webhook event data for diagnostics
 * Owner-only, non-prod only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = session.user as any;
  
  // Owner-only
  if (!user.orgId && user.role !== 'owner') {
    return NextResponse.json(
      { error: 'Owner access required' },
      { status: 403 }
    );
  }

  // Non-prod only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  const orgId = user.orgId || 'default';

  try {
    // Get last 50 MessageDelivery rows with message and thread info
    const deliveries = await (prisma as any).messageDelivery.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        message: {
          include: {
            thread: {
              select: {
                id: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                    contacts: {
                      select: {
                        e164: true,
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Transform to include fromE164 and toE164
    const transformedDeliveries = deliveries.map((delivery: any) => {
      const message = delivery.message;
      const thread = message?.thread;
      const clientContact = thread?.client?.contacts?.[0];
      
      return {
        id: delivery.id,
        createdAt: delivery.createdAt,
        direction: message?.direction,
        status: delivery.status,
        providerMessageSid: message?.providerMessageSid,
        errorCode: delivery.providerErrorCode,
        errorMessage: delivery.providerErrorMessage,
        fromE164: null, // We don't store this in MessageDelivery, need to get from thread's number
        toE164: clientContact?.e164 || null,
        threadId: message?.threadId,
        messageId: message?.id,
      };
    });

    // Get thread numbers for fromE164
    const threadIds = [...new Set(transformedDeliveries.map((d: any) => d.threadId).filter(Boolean))];
    const threads = await (prisma as any).thread.findMany({
      where: {
        id: { in: threadIds },
      },
      include: {
        messageNumber: {
          select: {
            e164: true,
          },
        },
      },
    });

    const threadNumberMap = new Map(threads.map((t: any) => [t.id, t.messageNumber?.e164]));

    const deliveriesWithFrom = transformedDeliveries.map((d: any) => ({
      ...d,
      fromE164: threadNumberMap.get(d.threadId) || null,
    }));

    // Get last 50 webhook events (we'll need to log these separately)
    // For now, return empty array - webhook logging will be added
    const webhookEvents: any[] = [];

    return NextResponse.json({
      deliveries: deliveriesWithFrom,
      webhookEvents: webhookEventsWithFrom,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Messaging Debug] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error.message },
      { status: 500 }
    );
  }
}
