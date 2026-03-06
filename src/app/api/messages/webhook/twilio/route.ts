/**
 * Canonical Twilio inbound webhook.
 * POST /api/messages/webhook/twilio
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { publish, channels } from '@/lib/realtime/bus';
import { logEvent } from '@/lib/log-event';
import { TwilioProvider } from '@/lib/messaging/providers/twilio';
import { normalizeE164 } from '@/lib/messaging/phone-utils';
import { getOrgIdFromNumber } from '@/lib/messaging/number-org-mapping';
import { createClientContact, findClientContactByPhone } from '@/lib/messaging/client-contact-lookup';

function twimlOk() {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(request: NextRequest) {
  let messageSid = '';
  let from = '';
  let to = '';
  try {
    const rawBody = await request.text();
    const body = new URLSearchParams(rawBody);
    messageSid = body.get('MessageSid') || '';
    from = normalizeE164(body.get('From') || '');
    to = normalizeE164(body.get('To') || '');
    const messageBody = (body.get('Body') || '').trim();

    const signature = request.headers.get('X-Twilio-Signature') || '';
    const webhookUrl = env.TWILIO_WEBHOOK_URL || `${request.nextUrl.origin}/api/messages/webhook/twilio`;
    const provider = new TwilioProvider();
    const isValid = provider.verifyWebhook(rawBody, signature, webhookUrl);
    if (!isValid) {
      await logEvent({
        orgId: 'unknown',
        action: 'message.webhook.invalid_signature',
        entityType: 'webhook',
        metadata: { from, to, messageSid },
      });
      return twimlOk();
    }

    let orgId: string;
    try {
      orgId = await getOrgIdFromNumber(to);
    } catch {
      await logEvent({
        orgId: 'unknown',
        action: 'message.webhook.org_unresolved',
        entityType: 'webhook',
        metadata: { from, to, messageSid },
      });
      return twimlOk();
    }

    const messageNumber = await prisma.messageNumber.findFirst({
      where: {
        orgId,
        status: 'active',
        OR: [{ e164: to }, { e164: body.get('To') || '' }],
      },
      select: { id: true, numberClass: true, assignedSitterId: true },
    });
    if (!messageNumber) {
      await logEvent({
        orgId,
        action: 'message.webhook.number_not_found',
        entityType: 'webhook',
        metadata: { from, to, messageSid },
      });
      return twimlOk();
    }

    const existing = messageSid
      ? await prisma.messageEvent.findFirst({
          where: { orgId, providerMessageSid: messageSid },
          select: { id: true, threadId: true },
        })
      : null;
    if (existing) return twimlOk();

    const existingContact = await findClientContactByPhone(orgId, from);
    let clientId = existingContact?.clientId ?? null;
    if (!clientId) {
      const guest = await (prisma as any).client.create({
        data: {
          orgId,
          firstName: 'Guest',
          lastName: from,
          phone: from,
        },
      });
      clientId = guest.id;
      await createClientContact({
        id: randomUUID(),
        orgId,
        clientId: guest.id,
        e164: from,
        label: 'Mobile',
        verified: false,
      });
    }
    if (!clientId) return twimlOk();

    let thread = await prisma.messageThread.findFirst({
      where: {
        orgId,
        clientId,
        messageNumberId: messageNumber.id,
        status: { notIn: ['closed', 'archived'] },
      },
      select: { id: true },
      orderBy: { lastMessageAt: 'desc' },
    });
    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          orgId,
          clientId,
          assignedSitterId: messageNumber.assignedSitterId,
          status: 'open',
          scope: messageNumber.numberClass === 'sitter' ? 'client_booking' : 'client_general',
          threadType: messageNumber.numberClass === 'sitter' ? 'assignment' : 'front_desk',
          numberClass: messageNumber.numberClass,
          messageNumberId: messageNumber.id,
          maskedNumberE164: to,
        },
        select: { id: true },
      });
    }

    const created = await prisma.messageEvent.create({
      data: {
        threadId: thread.id,
        orgId,
        direction: 'inbound',
        actorType: 'client',
        actorClientId: clientId,
        providerMessageSid: messageSid || null,
        body: messageBody,
        deliveryStatus: 'received',
      },
      select: { id: true },
    });

    await prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
        ownerUnreadCount: { increment: 1 },
      },
    });

    await publish(channels.messagesThread(orgId, thread.id), {
      type: 'message.new',
      threadId: thread.id,
      messageId: created.id,
      ts: Date.now(),
    }).catch(() => {});
    await logEvent({
      orgId,
      action: 'message.inbound_received',
      entityType: 'thread',
      entityId: thread.id,
      metadata: { from, to, messageSid, messageId: created.id },
    });
    return twimlOk();
  } catch (error: any) {
    console.error('[Messaging Webhook] Unexpected error:', error?.message || error);
    return twimlOk();
  }
}
