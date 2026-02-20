/**
 * Twilio Inbound Webhook
 * 
 * POST /api/messages/webhook/twilio
 * 
 * Handles inbound SMS from Twilio with proper signature validation and thread resolution.
 * This is the endpoint configured in Twilio webhook settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TwilioProvider } from '@/lib/messaging/providers/twilio';
import { getOrgIdFromNumber } from '@/lib/messaging/number-org-mapping';
import { env } from '@/lib/env';

export async function POST(request: NextRequest) {
  let messageSid: string = '';
  let from: string = '';
  let to: string = '';
  let messageBody: string = '';
  let rawBody: string = '';

  try {
    // Get raw body for signature verification
    rawBody = await request.text();
    const body = new URLSearchParams(rawBody);
    
    // Parse Twilio payload
    messageSid = body.get('MessageSid') || '';
    from = body.get('From') || '';
    to = body.get('To') || '';
    messageBody = body.get('Body') || '';

    // Log inbound webhook
    console.log('[Inbound Webhook] Received', {
      messageSid,
      from,
      to,
      bodyLength: messageBody.length,
      timestamp: new Date().toISOString(),
    });

    // Verify webhook signature
    const signature = request.headers.get('X-Twilio-Signature') || '';
    // CRITICAL: Use exact webhook URL that Twilio has configured
    // This must match exactly what's in Twilio console
    const webhookUrl = env.TWILIO_WEBHOOK_URL || 
      `${request.nextUrl.origin}/api/messages/webhook/twilio`;
    
    // Create provider - orgId will be resolved below
    const provider = new TwilioProvider(undefined, undefined);
    const isValid = provider.verifyWebhook(rawBody, signature, webhookUrl);

    // Log signature validation result
    console.log('[Inbound Webhook] Signature validation', {
      messageSid,
      from,
      to,
      webhookUrl,
      signatureValid: isValid,
      hasSignature: !!signature,
    });

    if (!isValid) {
      console.error('[Inbound Webhook] Invalid signature', {
        messageSid,
        from,
        to,
        webhookUrl,
        signatureLength: signature.length,
        // Don't log full signature for security
      });
      
      // Return 200 to prevent Twilio retries, but log error
      return NextResponse.json(
        { received: false, error: 'Invalid signature' },
        { status: 200 }
      );
    }

    // Get orgId from "to" number
    let orgId: string;
    try {
      orgId = await getOrgIdFromNumber(to);
      console.log('[Inbound Webhook] Resolved orgId', {
        to,
        orgId,
        messageSid,
      });
    } catch (error: any) {
      console.error('[Inbound Webhook] Failed to resolve orgId', {
        to,
        error: error.message,
        messageSid,
      });
      
      return NextResponse.json(
        { received: false, error: 'Failed to resolve organization' },
        { status: 200 } // Return 200 to prevent retries
      );
    }

    // Find the message number (To number)
    const messageNumber = await (prisma as any).messageNumber.findFirst({
      where: {
        orgId,
        e164: to,
        status: 'active',
      },
    });

    if (!messageNumber) {
      console.error('[Inbound Webhook] Number not found', {
        to,
        orgId,
        messageSid,
      });
      
      return NextResponse.json(
        { received: false, error: 'Number not found' },
        { status: 200 }
      );
    }

    // Find client contact by From number
    const clientContact = await (prisma as any).clientContact.findFirst({
      where: {
        orgId,
        e164: from,
      },
      include: {
        client: true,
      },
    });

    if (!clientContact) {
      console.warn('[Inbound Webhook] Client contact not found - creating guest', {
        from,
        orgId,
        messageSid,
      });
      
      // Create guest client and contact
      const guestClient = await (prisma as any).client.create({
        data: {
          orgId,
          name: `Guest (${from})`,
        },
      });

      const newContact = await (prisma as any).clientContact.create({
        data: {
          orgId,
          clientId: guestClient.id,
          e164: from,
          label: 'Mobile',
          verified: false,
        },
        include: {
          client: true,
        },
      });

      // Use new contact
      const resolvedContact = newContact;
      const client = guestClient;

      // Find or create thread
      let thread = await (prisma as any).thread.findUnique({
        where: {
          orgId_clientId: {
            orgId,
            clientId: client.id,
          },
        },
      });

      if (!thread) {
        thread = await (prisma as any).thread.create({
          data: {
            orgId,
            clientId: client.id,
            numberId: messageNumber.id,
            threadType: messageNumber.class === 'sitter' ? 'assignment' : 'front_desk',
            status: 'active',
            participants: {
              create: [
                { participantType: 'client', participantId: client.id },
              ],
            },
          },
        });
      }

      // Create inbound message
      const message = await (prisma as any).message.create({
        data: {
          orgId,
          threadId: thread.id,
          direction: 'inbound',
          senderType: 'client',
          senderId: client.id,
          body: messageBody,
          providerMessageSid: messageSid,
        },
      });

      // Update thread activity
      await (prisma as any).thread.update({
        where: { id: thread.id },
        data: {
          lastActivityAt: new Date(),
        },
      });

      console.log('[Inbound Webhook] Message stored', {
        messageId: message.id,
        threadId: thread.id,
        orgId,
        messageSid,
      });

      return NextResponse.json({
        received: true,
        messageId: message.id,
        threadId: thread.id,
      }, { status: 200 });
    }

    // Client contact exists - find or create thread
    const client = clientContact.client;

    // Find thread (one per org+client)
    let thread = await (prisma as any).thread.findUnique({
      where: {
        orgId_clientId: {
          orgId,
          clientId: client.id,
        },
      },
    });

    if (!thread) {
      // Create new thread
      thread = await (prisma as any).thread.create({
        data: {
          orgId,
          clientId: client.id,
          numberId: messageNumber.id,
          threadType: messageNumber.class === 'sitter' ? 'assignment' : 'front_desk',
          status: 'active',
          participants: {
            create: [
              { participantType: 'client', participantId: client.id },
            ],
          },
        },
      });

      console.log('[Inbound Webhook] Created new thread', {
        threadId: thread.id,
        orgId,
        clientId: client.id,
        messageSid,
      });
    }

    // Check for duplicate message (idempotency)
    const existingMessage = await (prisma as any).message.findUnique({
      where: {
        providerMessageSid: messageSid,
      },
    });

    if (existingMessage) {
      console.log('[Inbound Webhook] Duplicate message - already processed', {
        messageSid,
        existingMessageId: existingMessage.id,
      });
      
      return NextResponse.json({
        received: true,
        messageId: existingMessage.id,
        threadId: existingMessage.threadId,
        duplicate: true,
      }, { status: 200 });
    }

    // Create inbound message
    const message = await (prisma as any).message.create({
      data: {
        orgId,
        threadId: thread.id,
        direction: 'inbound',
        senderType: 'client',
        senderId: client.id,
        body: messageBody,
        providerMessageSid: messageSid,
      },
    });

    // Update thread activity
    await (prisma as any).thread.update({
      where: { id: thread.id },
      data: {
        lastActivityAt: new Date(),
      },
    });

    // Log thread resolution path
    console.log('[Inbound Webhook] Thread resolution', {
      toE164: to,
      fromE164: from,
      threadId: thread.id,
      orgId,
      clientId: client.id,
      messageSid,
      resolutionPath: `by (toE164=${to} masked number + fromE164=${from} sender) → threadId=${thread.id}`,
    });

    console.log('[Inbound Webhook] Message stored successfully', {
      messageId: message.id,
      threadId: thread.id,
      orgId,
      clientId: client.id,
      fromE164: from,
      toE164: to,
      messageSid,
      signatureValid: true, // Already validated above
    });

    // Store webhook event for diagnostics (if table exists)
    try {
      // Note: We don't have a WebhookEvent table yet, so we'll log to console for now
      // In production, this would be stored in a dedicated table
      console.log('[Inbound Webhook] Event logged', {
        messageSid,
        fromE164: from,
        toE164: to,
        signatureValid: true,
        orgId,
        threadId: thread.id,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      // Ignore - webhook event logging is optional
    }

    return NextResponse.json({
      received: true,
      messageId: message.id,
      threadId: thread.id,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Inbound Webhook] Unexpected error', {
      error: error.message,
      stack: error.stack,
      messageSid,
      from,
      to,
    });
    
    // Return 200 to prevent Twilio retries
    return NextResponse.json(
      { received: false, error: 'Internal server error' },
      { status: 200 }
    );
  }
}
