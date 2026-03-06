import { getScopedDb } from '@/lib/tenancy';
import { chooseFromNumber } from '@/lib/messaging/choose-from-number';
import { getClientE164ForClient } from '@/lib/messaging/client-contact-lookup';
import { getMessagingProvider } from '@/lib/messaging/provider-factory';
import { logEvent } from '@/lib/log-event';
import { publish, channels } from '@/lib/realtime/bus';

export type MessagingActorRole = 'owner' | 'admin' | 'sitter' | 'client' | 'system' | 'automation';

export interface MessagingActor {
  role: MessagingActorRole;
  userId?: string | null;
  sitterId?: string | null;
  clientId?: string | null;
}

export function asMessagingActorRole(role: string): MessagingActorRole | null {
  if (
    role === 'owner' ||
    role === 'admin' ||
    role === 'sitter' ||
    role === 'client' ||
    role === 'system' ||
    role === 'automation'
  ) {
    return role;
  }
  return null;
}

type ThreadForSend = {
  id: string;
  orgId: string;
  clientId: string | null;
  assignedSitterId: string | null;
  assignmentWindows: Array<{
    id: string;
    sitterId: string;
    startAt: Date;
    endAt: Date;
  }>;
};

export function assertMessagingThreadAccess(
  thread: ThreadForSend,
  actor: MessagingActor,
  requireActiveWindow: boolean
) {
  if (actor.role === 'owner' || actor.role === 'admin' || actor.role === 'system' || actor.role === 'automation') {
    return;
  }

  if (actor.role === 'client') {
    if (!actor.clientId || thread.clientId !== actor.clientId) {
      throw new Error('Forbidden: client cannot access this thread');
    }
    return;
  }

  if (actor.role === 'sitter') {
    if (!actor.sitterId) throw new Error('Forbidden: sitter context required');
    const activeWindow = thread.assignmentWindows[0];
    const isAssignedSitter = thread.assignedSitterId === actor.sitterId;
    const hasWindow = !!activeWindow && activeWindow.sitterId === actor.sitterId;
    if (!isAssignedSitter && !hasWindow) {
      throw new Error('Forbidden: sitter cannot access this thread');
    }
    if (requireActiveWindow) {
      if (!activeWindow || activeWindow.sitterId !== actor.sitterId) {
        throw new Error('Forbidden: no active assignment window');
      }
      const now = new Date();
      if (now < activeWindow.startAt || now > activeWindow.endAt) {
        throw new Error('Forbidden: assignment window not active');
      }
    }
    return;
  }

  throw new Error('Forbidden');
}

function actorTypeForEvent(role: MessagingActorRole): 'client' | 'sitter' | 'owner' | 'system' | 'automation' {
  if (role === 'admin') return 'owner';
  return role;
}

export async function sendThreadMessage(params: {
  orgId: string;
  threadId: string;
  actor: MessagingActor;
  body: string;
  forceSend?: boolean;
}) {
  const db = getScopedDb({ orgId: params.orgId });
  const thread = await db.messageThread.findUnique({
    where: { id: params.threadId },
    select: {
      id: true,
      orgId: true,
      clientId: true,
      assignedSitterId: true,
      assignmentWindows: {
        where: { startAt: { lte: new Date() }, endAt: { gte: new Date() } },
        orderBy: { startAt: 'desc' },
        take: 1,
        select: { id: true, sitterId: true, startAt: true, endAt: true },
      },
    },
  });

  if (!thread) throw new Error('Thread not found');
  assertMessagingThreadAccess(thread, params.actor, params.actor.role === 'sitter');

  const messageBody = params.body.trim();
  if (!messageBody) throw new Error('Message body cannot be empty');

  let deliveryStatus: 'queued' | 'sent' | 'delivered' | 'failed' = 'sent';
  let providerMessageSid: string | null = null;
  let providerErrorCode: string | null = null;
  let providerErrorMessage: string | null = null;

  const shouldDispatchProvider = params.actor.role !== 'client';
  if (shouldDispatchProvider) {
    if (!thread.clientId) throw new Error('Thread has no client');
    const routingResult = await chooseFromNumber(params.threadId, params.orgId);
    const toE164 = await getClientE164ForClient(params.orgId, thread.clientId);
    if (!toE164) throw new Error('Client contact not found');
    const provider = await getMessagingProvider(params.orgId);
    const sendResult = await provider.sendMessage({
      to: toE164,
      fromE164: routingResult.e164,
      fromNumberSid: undefined,
      body: messageBody,
    });
    deliveryStatus = sendResult.success ? 'sent' : 'failed';
    providerMessageSid = sendResult.messageSid ?? null;
    providerErrorCode = sendResult.success ? null : (sendResult.errorCode ?? 'UNKNOWN_ERROR');
    providerErrorMessage = sendResult.success ? null : (sendResult.errorMessage ?? 'Failed to send message');
  }

  const event = await db.messageEvent.create({
    data: {
      threadId: params.threadId,
      orgId: params.orgId,
      direction: 'outbound',
      actorType: actorTypeForEvent(params.actor.role),
      actorUserId: params.actor.role === 'client' ? null : (params.actor.userId ?? null),
      actorClientId: params.actor.role === 'client' ? (params.actor.clientId ?? null) : null,
      body: messageBody,
      deliveryStatus,
      providerMessageSid,
      failureCode: providerErrorCode,
      failureDetail: providerErrorMessage,
      providerErrorCode,
      providerErrorMessage,
      attemptCount: 1,
      lastAttemptAt: new Date(),
    },
  });

  await db.messageThread.update({
    where: { id: params.threadId },
    data: { lastMessageAt: new Date(), lastOutboundAt: new Date() },
  });

  const actorUserId = params.actor.userId ?? undefined;
  if (deliveryStatus === 'failed') {
    await logEvent({
      orgId: params.orgId,
      actorUserId,
      action: 'message.failed',
      entityType: 'message',
      entityId: event.id,
      metadata: { threadId: params.threadId, errorCode: providerErrorCode, errorMessage: providerErrorMessage },
    });
    await publish(channels.messagesThread(params.orgId, params.threadId), {
      type: 'message.updated',
      threadId: params.threadId,
      messageId: event.id,
      ts: Date.now(),
    }).catch(() => {});
  } else {
    await logEvent({
      orgId: params.orgId,
      actorUserId,
      action: 'message.sent',
      entityType: 'message',
      entityId: event.id,
      metadata: { threadId: params.threadId, providerMessageSid },
    });
    await publish(channels.messagesThread(params.orgId, params.threadId), {
      type: 'message.new',
      threadId: params.threadId,
      messageId: event.id,
      ts: Date.now(),
    }).catch(() => {});
  }

  return { event, deliveryStatus, providerMessageSid, providerErrorCode, providerErrorMessage };
}

export async function retryThreadMessage(params: {
  orgId: string;
  messageId: string;
  actor: MessagingActor;
}) {
  const db = getScopedDb({ orgId: params.orgId });
  const event = await db.messageEvent.findUnique({
    where: { id: params.messageId },
    include: {
      thread: {
        select: {
          id: true,
          orgId: true,
          clientId: true,
          assignedSitterId: true,
          assignmentWindows: {
            where: { startAt: { lte: new Date() }, endAt: { gte: new Date() } },
            orderBy: { startAt: 'desc' },
            take: 1,
            select: { id: true, sitterId: true, startAt: true, endAt: true },
          },
        },
      },
    },
  });

  if (!event) throw new Error('Message not found');
  if (event.direction !== 'outbound') throw new Error('Cannot retry inbound message');
  if (event.deliveryStatus !== 'failed') throw new Error('Message already succeeded');
  assertMessagingThreadAccess(event.thread, params.actor, params.actor.role === 'sitter');
  if (params.actor.role === 'client') throw new Error('Client cannot retry provider delivery');
  if (!event.thread.clientId) throw new Error('Thread has no client');

  const routingResult = await chooseFromNumber(event.thread.id, params.orgId);
  const toE164 = await getClientE164ForClient(params.orgId, event.thread.clientId);
  if (!toE164) throw new Error('Client contact not found');
  const provider = await getMessagingProvider(params.orgId);
  const sendResult = await provider.sendMessage({
    to: toE164,
    fromE164: routingResult.e164,
    fromNumberSid: undefined,
    body: event.body,
  });
  const attemptNo = (event.attemptCount ?? 1) + 1;

  const updated = await db.messageEvent.update({
    where: { id: params.messageId },
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

  await publish(channels.messagesThread(params.orgId, event.thread.id), {
    type: 'message.updated',
    threadId: event.thread.id,
    messageId: event.id,
    ts: Date.now(),
  }).catch(() => {});

  await logEvent({
    orgId: params.orgId,
    actorUserId: params.actor.userId ?? undefined,
    action: sendResult.success ? 'message.sent' : 'message.failed',
    entityType: 'message',
    entityId: event.id,
    metadata: {
      threadId: event.thread.id,
      attemptNo,
      success: sendResult.success,
      providerMessageSid: sendResult.messageSid ?? null,
      errorCode: sendResult.errorCode ?? null,
      errorMessage: sendResult.errorMessage ?? null,
    },
  });

  return { updated, attemptNo, success: sendResult.success };
}

export async function sendDirectMessage(params: {
  orgId: string;
  actor: MessagingActor;
  toE164: string;
  body: string;
  threadId?: string;
  fromE164?: string;
}) {
  const provider = await getMessagingProvider(params.orgId);
  let fromE164 = params.fromE164;
  if (!fromE164 && params.threadId) {
    const routing = await chooseFromNumber(params.threadId, params.orgId);
    fromE164 = routing.e164;
  }
  const sendResult = await provider.sendMessage({
    to: params.toE164,
    fromE164,
    body: params.body,
  });

  if (!params.threadId) return sendResult;

  const db = getScopedDb({ orgId: params.orgId });
  const event = await db.messageEvent.create({
    data: {
      threadId: params.threadId,
      orgId: params.orgId,
      direction: 'outbound',
      actorType: actorTypeForEvent(params.actor.role),
      actorUserId: params.actor.role === 'client' ? null : (params.actor.userId ?? null),
      actorClientId: params.actor.role === 'client' ? (params.actor.clientId ?? null) : null,
      body: params.body,
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
    where: { id: params.threadId },
    data: { lastMessageAt: new Date(), lastOutboundAt: new Date() },
  });
  await publish(channels.messagesThread(params.orgId, params.threadId), {
    type: sendResult.success ? 'message.new' : 'message.updated',
    threadId: params.threadId,
    messageId: event.id,
    ts: Date.now(),
  }).catch(() => {});
  return sendResult;
}

