/**
 * Twilio Inbound Webhook
 * 
 * POST /api/twilio/inbound
 * 
 * Handles inbound SMS from Twilio:
 * - Verifies webhook signature
 * - Routes to correct thread/mailbox
 * - Handles YES/NO commands for offers
 * - Persists messages to MessageEvent model
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TwilioProvider } from '@/lib/messaging/providers/twilio';
import { getOrgIdFromNumber } from '@/lib/messaging/number-org-mapping';
import { getSitterIdFromMaskedNumber } from '@/lib/messaging/number-sitter-mapping';
import { isAcceptCommand, isDeclineCommand } from '@/lib/messaging/sms-commands';
import { recordSitterAuditEvent } from '@/lib/audit-events';
import { processMessageEvent } from '@/lib/tiers/message-instrumentation';
import { syncBookingToCalendar } from '@/lib/calendar-sync';
import { env } from '@/lib/env';

// TwiML response helper
function twimlResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`;
  
  return new NextResponse(twiml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

/**
 * Handle YES command - accept latest active offer
 */
async function handleAcceptCommand(
  orgId: string,
  sitterId: string,
  fromNumber: string
): Promise<{ success: boolean; message: string }> {
  const now = new Date();

  // Find sitter's most recent active offer
  const offer = await (prisma as any).offerEvent.findFirst({
    where: {
      orgId,
      sitterId,
      status: 'sent',
      excluded: false,
      expiresAt: { gt: now },
    },
    orderBy: {
      offeredAt: 'desc',
    },
    include: {
      booking: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          service: true,
          startAt: true,
        },
      },
    },
  });

  if (!offer) {
    return {
      success: false,
      message: 'No active offer found. Please check the app for available bookings.',
    };
  }

  // Check if already accepted/declined (idempotency)
  if (offer.status === 'accepted' || offer.acceptedAt) {
    return {
      success: false,
      message: `Offer already accepted for ${offer.booking.firstName} ${offer.booking.lastName}'s ${offer.booking.service}.`,
    };
  }

  if (offer.status === 'declined' || offer.declinedAt) {
    return {
      success: false,
      message: 'This offer was already declined. Please check the app for new offers.',
    };
  }

  // Check if booking is already assigned
  const booking = await (prisma as any).booking.findUnique({
    where: { id: offer.bookingId },
    select: { sitterId: true, status: true },
  });

  if (booking?.sitterId && booking.sitterId !== sitterId) {
    return {
      success: false,
      message: 'This booking has already been assigned to another sitter.',
    };
  }

  const responseSeconds = Math.floor((now.getTime() - new Date(offer.offeredAt).getTime()) / 1000);

  // Update offer status
  await (prisma as any).offerEvent.update({
    where: { id: offer.id },
    data: {
      status: 'accepted',
      acceptedAt: now,
    },
  });

  // Assign booking to sitter
  await (prisma as any).booking.update({
    where: { id: offer.bookingId },
    data: {
      sitterId: sitterId,
      status: 'confirmed',
    },
  });

  // Record audit event
  await recordSitterAuditEvent({
    orgId,
    sitterId,
    eventType: 'offer.accepted',
    actorType: 'sitter',
    actorId: sitterId,
    entityType: 'offer',
    entityId: offer.id,
    bookingId: offer.bookingId,
    metadata: {
      source: 'sms',
      responseSeconds,
      offerId: offer.id,
    },
  });

  // Update metrics window (inline logic, same as accept endpoint)
  try {
    await updateMetricsWindowForOffer(orgId, sitterId, responseSeconds, 'accepted');
  } catch (error) {
    console.error('[SMS Accept] Failed to update metrics:', error);
  }

  // Sync to Google Calendar (fail-open: don't block assignment)
  try {
    await syncBookingToCalendar(orgId, offer.bookingId, sitterId, 'Booking accepted via SMS');
  } catch (error) {
    console.error('[SMS Accept] Calendar sync failed:', error);
    // Don't throw - booking assignment succeeds even if calendar sync fails
  }

  return {
    success: true,
    message: `Offer accepted! You've been assigned to ${offer.booking.firstName} ${offer.booking.lastName}'s ${offer.booking.service}. Check the app for details.`,
  };
}

/**
 * Handle NO command - decline latest active offer
 */
async function handleDeclineCommand(
  orgId: string,
  sitterId: string
): Promise<{ success: boolean; message: string }> {
  const now = new Date();

  // Find sitter's most recent active offer
  const offer = await (prisma as any).offerEvent.findFirst({
    where: {
      orgId,
      sitterId,
      status: 'sent',
      excluded: false,
    },
    orderBy: {
      offeredAt: 'desc',
    },
    include: {
      booking: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          service: true,
        },
      },
    },
  });

  if (!offer) {
    return {
      success: false,
      message: 'No active offer found. Please check the app for available bookings.',
    };
  }

  // Check if already accepted/declined (idempotency)
  if (offer.status === 'accepted' || offer.acceptedAt) {
    return {
      success: false,
      message: 'This offer was already accepted.',
    };
  }

  if (offer.status === 'declined' || offer.declinedAt) {
    return {
      success: false,
      message: 'This offer was already declined.',
    };
  }

  const isExpired = offer.expiresAt && new Date(offer.expiresAt) < now;
  const responseSeconds = Math.floor((now.getTime() - new Date(offer.offeredAt).getTime()) / 1000);

  // Update offer status
  await (prisma as any).offerEvent.update({
    where: { id: offer.id },
    data: {
      status: isExpired ? 'expired' : 'declined',
      declinedAt: now,
      declineReason: isExpired ? 'expired' : 'declined',
    },
  });

  // Record audit event
  await recordSitterAuditEvent({
    orgId,
    sitterId,
    eventType: 'offer.declined',
    actorType: 'sitter',
    actorId: sitterId,
    entityType: 'offer',
    entityId: offer.id,
    bookingId: offer.bookingId,
    metadata: {
      source: 'sms',
      responseSeconds,
      reason: isExpired ? 'expired' : 'declined',
      offerId: offer.id,
    },
  });

  // Update metrics window
  try {
    await updateMetricsWindowForOffer(orgId, sitterId, responseSeconds, 'declined');
  } catch (error) {
    console.error('[SMS Decline] Failed to update metrics:', error);
  }

  return {
    success: true,
    message: 'Offer declined. We\'ll notify you of new opportunities.',
  };
}

/**
 * Update metrics window (reused from accept/decline endpoints)
 */
async function updateMetricsWindowForOffer(
  orgId: string,
  sitterId: string,
  responseSeconds: number,
  action: 'accepted' | 'declined'
) {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const existing = await (prisma as any).sitterMetricsWindow.findFirst({
    where: {
      orgId,
      sitterId,
      windowStart: { lte: sevenDaysAgo },
      windowEnd: { gte: now },
      windowType: 'weekly_7d',
    },
  });

  const offers = await (prisma as any).offerEvent.findMany({
    where: {
      orgId,
      sitterId,
      offeredAt: { gte: sevenDaysAgo, lte: now },
      excluded: false,
    },
  });

  const totalOffers = offers.length;
  const accepted = offers.filter((o: any) => o.status === 'accepted' || o.acceptedAt).length;
  const declined = offers.filter((o: any) => o.status === 'declined' || o.declinedAt).length;
  const expired = offers.filter((o: any) => o.status === 'expired' || (o.expiresAt && new Date(o.expiresAt) < now && !o.acceptedAt && !o.declinedAt)).length;

  const responseTimes = offers
    .filter((o: any) => o.acceptedAt || o.declinedAt)
    .map((o: any) => {
      const respondedAt = o.acceptedAt || o.declinedAt;
      return Math.floor((new Date(respondedAt).getTime() - new Date(o.offeredAt).getTime()) / 1000);
    });

  const avgResponseSeconds = responseTimes.length > 0
    ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
    : null;

  const sortedTimes = [...responseTimes].sort((a: number, b: number) => a - b);
  const medianResponseSeconds = sortedTimes.length > 0
    ? sortedTimes[Math.floor(sortedTimes.length / 2)]
    : null;

  const offerAcceptRate = totalOffers > 0 ? accepted / totalOffers : null;
  const offerDeclineRate = totalOffers > 0 ? declined / totalOffers : null;
  const offerExpireRate = totalOffers > 0 ? expired / totalOffers : null;

  if (existing) {
    await (prisma as any).sitterMetricsWindow.update({
      where: { id: existing.id },
      data: {
        avgResponseSeconds,
        medianResponseSeconds,
        offerAcceptRate,
        offerDeclineRate,
        offerExpireRate,
        lastOfferRespondedAt: now,
        updatedAt: now,
      },
    });
  } else {
    await (prisma as any).sitterMetricsWindow.create({
      data: {
        orgId,
        sitterId,
        windowStart: sevenDaysAgo,
        windowEnd: now,
        windowType: 'weekly_7d',
        avgResponseSeconds,
        medianResponseSeconds,
        offerAcceptRate,
        offerDeclineRate,
        offerExpireRate,
        lastOfferRespondedAt: now,
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = new URLSearchParams(rawBody);
    
    // Parse Twilio payload
    const messageSid = body.get('MessageSid') || '';
    const from = body.get('From') || '';
    const to = body.get('To') || '';
    const messageBody = body.get('Body') || '';

    // Verify webhook signature
    const signature = request.headers.get('X-Twilio-Signature') || '';
    // Use TWILIO_WEBHOOK_URL if set, otherwise construct from request
    const webhookUrl = env.TWILIO_WEBHOOK_URL || 
      `${request.nextUrl.origin}/api/twilio/inbound`;
    
    const provider = new TwilioProvider();
    const isValid = provider.verifyWebhook(rawBody, signature, webhookUrl);

    if (!isValid) {
      console.error('[Twilio Webhook] Invalid signature');
      
      // Record signature verification failure as EventLog
      try {
        // Try to get orgId from number for better context
        let orgIdForLog = 'unknown';
        try {
          orgIdForLog = await getOrgIdFromNumber(to);
        } catch {
          // Ignore - orgId will be 'unknown'
        }
        
        await recordSitterAuditEvent({
          orgId: orgIdForLog,
          sitterId: 'system',
          eventType: 'messaging.routing_failed',
          actorType: 'system',
          actorId: 'system',
          entityType: 'message',
          metadata: {
            fromNumber: from,
            toNumber: to,
            reason: 'Invalid webhook signature',
            messageSid: messageSid,
            remediation: 'Verify Twilio webhook URL and auth token configuration. Check webhook URL matches configured value.',
          },
        });
      } catch (error) {
        console.error('[Twilio Webhook] Failed to log signature failure:', error);
      }
      
      // Still return 200 + TwiML to avoid Twilio retries, but log error
      return twimlResponse('We couldn\'t verify this message. Please contact support.');
    }

    // Get orgId from "to" number
    let orgId: string;
    try {
      orgId = await getOrgIdFromNumber(to);
    } catch (error: any) {
      console.error(`[Twilio Webhook] Failed to resolve orgId from number ${to}:`, error);
      
      // Record orgId resolution failure as EventLog
      try {
        await recordSitterAuditEvent({
          orgId: 'unknown',
          sitterId: 'system',
          eventType: 'messaging.routing_failed',
          actorType: 'system',
          actorId: 'system',
          entityType: 'message',
          metadata: {
            fromNumber: from,
            toNumber: to,
            reason: `Failed to resolve orgId: ${error.message}`,
            messageSid: messageSid,
            remediation: 'Check number provisioning and organization mapping. Verify number exists in MessageNumber table.',
          },
        });
      } catch (logError) {
        console.error('[Twilio Webhook] Failed to log orgId resolution failure:', logError);
      }
      
      return twimlResponse('We couldn\'t match this message. Please contact support.');
    }

    // Check if this is a YES/NO command from a sitter
    const sitterId = await getSitterIdFromMaskedNumber(to);
    
    if (sitterId && isAcceptCommand(messageBody)) {
      // Handle YES command
      const result = await handleAcceptCommand(orgId, sitterId, from);
      
      // Write system message to thread
      try {
        // Find or create thread for this sitter
        const thread = await (prisma as any).messageThread.findFirst({
          where: {
            orgId,
            assignedSitterId: sitterId,
            scope: { in: ['client_booking', 'client_general'] },
          },
          orderBy: { lastMessageAt: 'desc' },
        });

        if (thread) {
          await (prisma as any).messageEvent.create({
            data: {
              threadId: thread.id,
              orgId,
              direction: 'outbound',
              actorType: 'system',
              body: `Offer accepted via SMS: ${result.message}`,
              createdAt: new Date(),
              deliveryStatus: 'sent',
            },
          });
        }
      } catch (error) {
        console.error('[SMS Accept] Failed to write system message:', error);
      }

      return twimlResponse(result.message);
    }

    if (sitterId && isDeclineCommand(messageBody)) {
      // Handle NO command
      const result = await handleDeclineCommand(orgId, sitterId);
      
      // Write system message to thread
      try {
        const thread = await (prisma as any).messageThread.findFirst({
          where: {
            orgId,
            assignedSitterId: sitterId,
            scope: { in: ['client_booking', 'client_general'] },
          },
          orderBy: { lastMessageAt: 'desc' },
        });

        if (thread) {
          await (prisma as any).messageEvent.create({
            data: {
              threadId: thread.id,
              orgId,
              direction: 'outbound',
              actorType: 'system',
              body: `Offer declined via SMS: ${result.message}`,
              createdAt: new Date(),
              deliveryStatus: 'sent',
            },
          });
        }
      } catch (error) {
        console.error('[SMS Decline] Failed to write system message:', error);
      }

      return twimlResponse(result.message);
    }

    // Regular message - route to thread
    // Find or create thread based on number and client
    const messageNumber = await (prisma as any).messageNumber.findFirst({
      where: {
        e164: to,
        status: 'active',
      },
      select: {
        id: true,
        numberClass: true,
        assignedSitterId: true,
        orgId: true,
      },
    });

    if (!messageNumber || messageNumber.orgId !== orgId) {
      console.error(`[Twilio Webhook] Number ${to} not found or org mismatch`);
      
      // Record routing failure as EventLog
      try {
        await recordSitterAuditEvent({
          orgId,
          sitterId: 'system',
          eventType: 'messaging.routing_failed',
          actorType: 'system',
          actorId: 'system',
          entityType: 'message',
          metadata: {
            fromNumber: from,
            toNumber: to,
            reason: 'Number not found or org mismatch',
            messageSid: messageSid,
            remediation: 'Check booking assignment or re-provision number. Verify number is assigned to correct organization.',
          },
        });
      } catch (error) {
        console.error('[Twilio Webhook] Failed to log routing failure:', error);
      }
      
      return twimlResponse('We couldn\'t match this message. Please contact support.');
    }

    // Find client by phone (raw SQL to avoid ClientContact.orgld bug)
    const { findClientContactByPhone } = await import('@/lib/messaging/client-contact-lookup');
    const clientContactRow = await findClientContactByPhone(orgId, from);
    const clientContact = clientContactRow
      ? {
          client: await (prisma as any).client.findUnique({
            where: { id: clientContactRow.clientId },
            select: { id: true, orgId: true },
          }),
        }
      : null;

    if (!clientContact?.client) {
      // No client found - route to owner inbox
      const ownerThread = await (prisma as any).messageThread.findFirst({
        where: {
          orgId,
          scope: 'internal',
        },
      }) || await (prisma as any).messageThread.create({
        data: {
          orgId,
          scope: 'internal',
          status: 'open',
          clientId: null,
          assignedSitterId: null,
        },
      });

      // Persist message to owner inbox
      await (prisma as any).messageEvent.create({
        data: {
          threadId: ownerThread.id,
          orgId,
          direction: 'inbound',
          actorType: 'client',
          providerMessageSid: messageSid,
          body: messageBody,
          createdAt: new Date(),
          deliveryStatus: 'received',
        },
      });

      await recordSitterAuditEvent({
        orgId,
        sitterId: 'system',
        eventType: 'message.inbound_received',
        actorType: 'system',
        actorId: from,
        entityType: 'thread',
        entityId: ownerThread.id,
        metadata: {
          messageSid,
          from,
          to,
          threadId: ownerThread.id,
          reason: 'client_not_found',
        },
      });

      return twimlResponse('');
    }

    const clientId = clientContact!.client.id;

    // Determine thread scope based on number class and sitter assignment
    let threadScope: string;
    let assignedSitterId: string | null = null;

    if (messageNumber.numberClass === 'sitter' && messageNumber.assignedSitterId) {
      // Sitter number - route to sitter mailbox
      threadScope = 'client_booking'; // or 'client_general' if no active booking
      assignedSitterId = messageNumber.assignedSitterId;
    } else if (messageNumber.numberClass === 'front_desk') {
      // Front desk - route to owner inbox
      threadScope = 'internal';
    } else {
      // Pool or other - route to owner inbox
      threadScope = 'internal';
    }

    // Find or create thread
    let thread = await (prisma as any).messageThread.findFirst({
      where: {
        orgId,
        clientId,
        assignedSitterId: assignedSitterId || undefined,
        scope: threadScope,
        status: { notIn: ['closed', 'archived'] },
      },
    });

    if (!thread) {
      // Create new thread
      thread = await (prisma as any).messageThread.create({
        data: {
          orgId,
          clientId,
          assignedSitterId,
          scope: threadScope,
          status: 'open',
          messageNumberId: messageNumber.id,
          numberClass: messageNumber.numberClass,
          maskedNumberE164: to,
        },
      });
    }

    // Persist inbound message to MessageEvent
    let messageEventId: string;
    try {
      const messageEvent = await (prisma as any).messageEvent.create({
        data: {
          threadId: thread.id,
          orgId,
          direction: 'inbound',
          actorType: 'client',
          actorClientId: clientId,
          providerMessageSid: messageSid,
          body: messageBody,
          createdAt: new Date(),
          deliveryStatus: 'received',
        },
      });
      messageEventId = messageEvent.id;

      // Process message for tier metrics (creates MessageResponseLink if needed)
      try {
        await processMessageEvent(
          orgId,
          thread.id,
          messageEventId,
          {
            direction: 'inbound',
            actorType: 'client',
            body: messageBody,
            createdAt: new Date(messageEvent.createdAt),
          }
        );
      } catch (error) {
        console.error('[Twilio Webhook] Failed to process message for tier metrics:', error);
        // Don't fail the request if tier processing fails
      }

      // Update thread timestamps
      await (prisma as any).messageThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: new Date(),
          lastInboundAt: new Date(),
        },
      });

      // Record audit event
      await recordSitterAuditEvent({
        orgId,
        sitterId: assignedSitterId || 'system',
        eventType: 'message.inbound_received',
        actorType: 'system',
        actorId: from,
        entityType: 'thread',
        entityId: thread.id,
        metadata: {
          messageSid,
          from,
          to,
          threadId: thread.id,
          scope: threadScope,
        },
      });
    } catch (error: any) {
      console.error('[Twilio Webhook] Failed to persist message:', error);
      // Still return 200 to avoid Twilio retries
      return twimlResponse('Message received. We\'ll get back to you soon.');
    }

    // Return empty TwiML (no auto-response for regular messages)
    return twimlResponse('');
  } catch (error: any) {
    console.error('[Twilio Webhook] Unexpected error:', error);
    // Always return 200 + TwiML to prevent Twilio retries
    return twimlResponse('We couldn\'t process this message. Please contact support.');
  }
}
