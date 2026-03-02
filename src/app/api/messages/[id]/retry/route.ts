/**
 * Retry Message Route
 *
 * POST /api/messages/[id]/retry
 * When NEXT_PUBLIC_API_URL is set: proxies to NestJS API.
 * Otherwise: re-sends via provider, updates MessageEvent, logs EventLog.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { getScopedDb } from '@/lib/tenancy';
import { chooseFromNumber } from '@/lib/messaging/choose-from-number';
import { getClientE164ForClient } from '@/lib/messaging/client-contact-lookup';
import { getMessagingProvider } from '@/lib/messaging/provider-factory';
import { logEvent } from '@/lib/log-event';
import { publish, channels } from '@/lib/realtime/bus';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const messageId = params.id;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';

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
      return NextResponse.json({ error: 'Failed to authenticate with API' }, { status: 500 });
    }

    const apiUrl = `${API_BASE_URL}/api/messages/${messageId}/retry`;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
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
        headers: { 'Content-Type': contentType || 'application/json' },
      });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to forward retry request:', error);
      return NextResponse.json(
        { error: 'Failed to reach API server', message: error.message },
        { status: 502 }
      );
    }
  }

  // Prisma: retry failed MessageEvent (scoped by orgId)
  const db = getScopedDb({ orgId });
  const event = await db.messageEvent.findUnique({
    where: { id: messageId },
    include: {
      thread: {
        include: {
          assignmentWindows: {
            where: { startAt: { lte: new Date() }, endAt: { gte: new Date() } },
            orderBy: { startAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  if (event.direction !== 'outbound') {
    return NextResponse.json({ error: 'Cannot retry inbound message' }, { status: 400 });
  }

  if (event.deliveryStatus !== 'failed') {
    return NextResponse.json(
      {
        error: 'Message already succeeded',
        currentStatus: event.deliveryStatus,
        code: 'ALREADY_SENT',
      },
      { status: 409 }
    );
  }

  const thread = event.thread;
  if (!thread?.clientId) {
    return NextResponse.json({ error: 'Thread has no client' }, { status: 400 });
  }

  if (user.sitterId) {
    const activeWindow = thread.assignmentWindows?.[0];
    if (!activeWindow || activeWindow.sitterId !== user.sitterId) {
      return NextResponse.json(
        { error: 'Cannot retry outside active assignment window' },
        { status: 403 }
      );
    }
  }

  const routingResult = await chooseFromNumber(thread.id, orgId);
  const toE164 = await getClientE164ForClient(thread.orgId, thread.clientId);
  if (!toE164) {
    return NextResponse.json({ error: 'Client contact not found' }, { status: 400 });
  }

  let provider;
  try {
    provider = await getMessagingProvider(orgId);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'Messaging provider not configured',
        detail: err?.message ?? 'Connect provider in /setup or set credentials.',
      },
      { status: 400 }
    );
  }

  let sendResult;
  try {
    sendResult = await provider.sendMessage({
      to: toE164,
      fromE164: routingResult.e164,
      fromNumberSid: undefined,
      body: event.body,
    });
  } catch (err: any) {
    const msg = err?.message ?? '';
    if (msg.includes('credentials') || msg.includes('not configured') || msg.includes('Connect provider')) {
      return NextResponse.json(
        {
          error: 'Messaging provider not configured',
          detail: 'Connect provider in /setup or set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
        },
        { status: 400 }
      );
    }
    throw err;
  }

  const attemptNo = (event.attemptCount ?? 1) + 1;

  await db.messageEvent.update({
    where: { id: messageId },
    data: {
      deliveryStatus: sendResult.success ? 'sent' : 'failed',
      providerMessageSid: sendResult.messageSid ?? event.providerMessageSid,
      failureCode: sendResult.success ? null : (sendResult.errorCode ?? 'UNKNOWN_ERROR'),
      failureDetail: sendResult.success ? null : (sendResult.errorMessage ?? 'Retry failed'),
      providerErrorCode: sendResult.success ? null : (sendResult.errorCode ?? 'UNKNOWN_ERROR'),
      providerErrorMessage: sendResult.success ? null : (sendResult.errorMessage ?? 'Retry failed'),
      attemptCount: attemptNo,
      lastAttemptAt: new Date(),
    },
  });

  publish(channels.messagesThread(orgId, thread.id), {
    type: 'message.updated',
    threadId: thread.id,
    messageId,
    ts: Date.now(),
  }).catch(() => {});

  const actorUserId = user.id || user.email || '';

  logEvent({
    orgId,
    actorUserId,
    action: 'message.retry',
    entityType: 'message',
    entityId: messageId,
    metadata: {
      threadId: thread.id,
      attemptNo,
      success: sendResult.success,
      providerMessageSid: sendResult.messageSid,
    },
  }).catch(() => {});

  if (sendResult.success) {
    logEvent({
      orgId,
      actorUserId,
      action: 'message.sent',
      entityType: 'message',
      entityId: messageId,
      metadata: { threadId: thread.id, providerMessageSid: sendResult.messageSid },
    }).catch(() => {});
  } else {
    logEvent({
      orgId,
      actorUserId,
      action: 'message.failed',
      entityType: 'message',
      entityId: messageId,
      metadata: {
        threadId: thread.id,
        errorCode: sendResult.errorCode,
        errorMessage: sendResult.errorMessage,
      },
    }).catch(() => {});
  }

  return NextResponse.json(
    { success: sendResult.success, attemptNo },
    {
      status: 200,
      headers: { 'X-Snout-Route': 'prisma', 'X-Snout-OrgId': orgId },
    }
  );
}
