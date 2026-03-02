/**
 * Get Messages for Thread Route
 *
 * GET /api/messages/threads/[id]/messages
 * When NEXT_PUBLIC_API_URL is set: proxies to NestJS API.
 * Otherwise: reads from Prisma MessageEvent (source of truth).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { getScopedDb } from '@/lib/tenancy';
import { chooseFromNumber } from '@/lib/messaging/choose-from-number';
import { getClientE164ForClient } from '@/lib/messaging/client-contact-lookup';
import { getMessagingProvider } from '@/lib/messaging/provider-factory';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logEvent } from '@/lib/log-event';
import { publish, channels } from '@/lib/realtime/bus';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/** Map MessageEvent to Message shape expected by InboxView (deliveries array) */
function messageEventToMessage(ev: {
  id: string;
  threadId: string;
  direction: string;
  actorType: string;
  actorUserId: string | null;
  body: string;
  deliveryStatus: string;
  providerMessageSid: string | null;
  failureCode: string | null;
  failureDetail: string | null;
  providerErrorCode: string | null;
  providerErrorMessage: string | null;
  createdAt: Date;
}) {
  const delivery = {
    id: ev.id,
    attemptNo: 1,
    status: ev.deliveryStatus as 'queued' | 'sent' | 'delivered' | 'failed',
    providerErrorCode: ev.providerErrorCode ?? ev.failureCode,
    providerErrorMessage: ev.providerErrorMessage ?? ev.failureDetail,
    createdAt: ev.createdAt.toISOString(),
  };
  return {
    id: ev.id,
    threadId: ev.threadId,
    direction: ev.direction as 'inbound' | 'outbound',
    senderType: ev.actorType as 'client' | 'sitter' | 'owner' | 'system' | 'automation',
    senderId: ev.actorUserId,
    body: ev.body,
    redactedBody: null as string | null,
    hasPolicyViolation: false,
    createdAt: ev.createdAt.toISOString(),
    deliveries: [delivery],
    policyViolations: [],
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const threadId = params.id;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = (session.user as { orgId?: string }).orgId ?? 'default';

  if (API_BASE_URL) {
    let apiToken: string;
    try {
      const user = session.user as any;
      apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to mint API JWT:', error);
      return NextResponse.json({ error: 'Failed to authenticate with API' }, { status: 500 });
    }

    const apiUrl = `${API_BASE_URL}/api/messages/threads/${threadId}`;
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
      });

      const contentType = response.headers.get('content-type');
      const responseData = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        return NextResponse.json(responseData, {
          status: response.status,
          headers: { 'Content-Type': contentType || 'application/json' },
        });
      }

      return NextResponse.json(responseData, {
        status: response.status,
        headers: { 'Content-Type': contentType || 'application/json', 'X-Snout-Route': 'nestjs-proxy' },
      });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to forward messages request:', error);
      return NextResponse.json(
        { error: 'Failed to reach API server', message: error.message },
        { status: 502 }
      );
    }
  }

  // Prisma source of truth (scoped by orgId)
  const db = getScopedDb({ orgId });
  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    select: { id: true, orgId: true },
  });

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  const events = await db.messageEvent.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
  });

  const messages = events.map((ev) => messageEventToMessage(ev));

  return NextResponse.json(messages, {
    status: 200,
    headers: { 'X-Snout-Route': 'prisma', 'X-Snout-OrgId': orgId },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const threadId = params.id;

  const id = getRateLimitIdentifier(request);
  const rl = await checkRateLimit(id, { keyPrefix: 'messages-send', limit: 30, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    );
  }

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';
  const senderType = user.role === 'owner' ? 'owner' : 'sitter';
  const senderId = user.id || user.email || '';

  let body: { body: string; forceSend?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const messageBody = body.body?.trim();
  if (!messageBody) {
    return NextResponse.json(
      { error: 'Message body cannot be empty' },
      { status: 400 }
    );
  }

  // If API_BASE_URL is set, proxy to NestJS API
  if (API_BASE_URL) {
    let apiToken: string;
    try {
      apiToken = await mintApiJWT({
        userId: senderId,
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

    // Try the new endpoint first, fallback to /api/messages/send
    const apiUrl = `${API_BASE_URL}/api/messages/threads/${threadId}/messages`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          body: messageBody,
          forceSend: body.forceSend || false,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        return NextResponse.json(responseData, { status: 200 });
      }

      // If 404, fallback to /api/messages/send
      if (response.status === 404) {
        const fallbackUrl = `${API_BASE_URL}/api/messages/send`;
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            threadId,
            body: messageBody,
            forceSend: body.forceSend || false,
          }),
        });

        const fallbackData = await fallbackResponse.json();
        return NextResponse.json(fallbackData, { status: fallbackResponse.status });
      }

      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to forward send message request:', error);
      // Fall through to Prisma fallback
    }
  }

  // Prisma source of truth (used when API not set or API request failed)
  const db = getScopedDb({ orgId });
  try {
    const thread = await db.messageThread.findUnique({
      where: { id: threadId },
      include: {
        messageNumber: true,
        client: { select: { id: true, firstName: true, lastName: true } },
        assignmentWindows: {
          where: {
            startAt: { lte: new Date() },
            endAt: { gte: new Date() },
          },
          orderBy: { startAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (user.sitterId) {
      const now = new Date();
      const activeWindow = thread.assignmentWindows?.[0];
      if (!activeWindow || activeWindow.sitterId !== user.sitterId) {
        return NextResponse.json(
          { error: 'Cannot send message outside active assignment window', code: 'WINDOW_NOT_ACTIVE' },
          { status: 403 }
        );
      }
      if (now < activeWindow.startAt || now > activeWindow.endAt) {
        return NextResponse.json(
          {
            error: 'Assignment window is not active.',
            code: 'WINDOW_NOT_ACTIVE',
            windowStartsAt: activeWindow.startAt.toISOString(),
            windowEndsAt: activeWindow.endAt.toISOString(),
          },
          { status: 403 }
        );
      }
    }

    const clientId = thread.clientId;
    if (!clientId) {
      return NextResponse.json({ error: 'Thread has no client' }, { status: 400 });
    }

    const routingResult = await chooseFromNumber(threadId, orgId);
    const toE164 = await getClientE164ForClient(thread.orgId, clientId);
    if (!toE164) {
      return NextResponse.json({ error: 'Client contact not found' }, { status: 400 });
    }

    const provider = await getMessagingProvider(orgId);
    const sendResult = await provider.sendMessage({
      to: toE164,
      fromE164: routingResult.e164,
      fromNumberSid: undefined,
      body: messageBody,
    });

    const event = await db.messageEvent.create({
      data: {
        threadId,
        orgId,
        direction: 'outbound',
        actorType: senderType,
        actorUserId: senderId,
        body: messageBody,
        deliveryStatus: sendResult.success ? 'sent' : 'failed',
        providerMessageSid: sendResult.messageSid ?? null,
        failureCode: sendResult.success ? null : (sendResult.errorCode ?? 'UNKNOWN_ERROR'),
        failureDetail: sendResult.success ? null : (sendResult.errorMessage ?? 'Failed to send message'),
        providerErrorCode: sendResult.success ? null : (sendResult.errorCode ?? 'UNKNOWN_ERROR'),
        providerErrorMessage: sendResult.success ? null : (sendResult.errorMessage ?? 'Failed to send message'),
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    });

    await db.messageThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        lastOutboundAt: new Date(),
      },
    });

    if (!sendResult.success) {
      logEvent({
        orgId,
        actorUserId: senderId,
        action: 'message.failed',
        entityType: 'message',
        entityId: event.id,
        metadata: {
          threadId,
          errorCode: sendResult.errorCode,
          errorMessage: sendResult.errorMessage,
        },
      }).catch(() => {});
      publish(channels.messagesThread(orgId, threadId), {
        type: 'message.updated',
        threadId,
        messageId: event.id,
        ts: Date.now(),
      }).catch(() => {});

      return NextResponse.json(
        {
          messageId: event.id,
          hasPolicyViolation: false,
          error: sendResult.errorMessage || 'Failed to send message',
          errorCode: sendResult.errorCode,
          twilioError: { code: sendResult.errorCode, message: sendResult.errorMessage },
        },
        { status: 500 }
      );
    }

    logEvent({
      orgId,
      actorUserId: senderId,
      action: 'message.sent',
      entityType: 'message',
      entityId: event.id,
      metadata: { threadId, providerMessageSid: sendResult.messageSid },
    }).catch(() => {});
    publish(channels.messagesThread(orgId, threadId), {
      type: 'message.new',
      threadId,
      messageId: event.id,
      ts: Date.now(),
    }).catch(() => {});

    return NextResponse.json(
      {
        messageId: event.id,
        providerMessageSid: sendResult.messageSid,
        hasPolicyViolation: false,
      },
      {
        status: 200,
        headers: { 'X-Snout-Route': 'prisma', 'X-Snout-OrgId': orgId },
      }
    );
  } catch (error: any) {
    console.error('[Direct Prisma] Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}
