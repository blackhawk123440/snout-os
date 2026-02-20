/**
 * Test SMS Endpoint
 * 
 * POST /api/setup/test-sms
 * Sends a test SMS using the same send pipeline (chooseFromNumber + TwilioProvider.sendMessage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { chooseFromNumber } from '@/lib/messaging/choose-from-number';
import { getMessagingProvider } from '@/lib/messaging/provider-factory';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';

  let body: { destinationE164: string; fromClass: 'front_desk' | 'pool' | 'sitter' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (!body.destinationE164) {
    return NextResponse.json(
      { success: false, error: 'destinationE164 is required' },
      { status: 400 }
    );
  }

  try {
    // Find or create a test thread for this destination
    const normalizedPhone = body.destinationE164.startsWith('+') ? body.destinationE164 : `+${body.destinationE164}`;
    
    // Find client contact
    let clientContact = await (prisma as any).clientContact.findFirst({
      where: {
        orgId,
        e164: normalizedPhone,
      },
      include: {
        client: true,
      },
    });

    if (!clientContact) {
      // Create guest client
      const guestClient = await (prisma as any).client.create({
        data: {
          orgId,
          name: `Test (${normalizedPhone})`,
        },
      });

      clientContact = await (prisma as any).clientContact.create({
        data: {
          orgId,
          clientId: guestClient.id,
          e164: normalizedPhone,
          label: 'Mobile',
          verified: false,
        },
        include: {
          client: true,
        },
      });
    }

    // Find or create thread
    let thread = await (prisma as any).thread.findUnique({
      where: {
        orgId_clientId: {
          orgId,
          clientId: clientContact.client.id,
        },
      },
    });

    if (!thread) {
      // Get number based on fromClass
      const messageNumber = await (prisma as any).messageNumber.findFirst({
        where: {
          orgId,
          class: body.fromClass,
          status: 'active',
        },
      });

      if (!messageNumber) {
        return NextResponse.json(
          { success: false, error: `No ${body.fromClass} number available` },
          { status: 400 }
        );
      }

      thread = await (prisma as any).thread.create({
        data: {
          orgId,
          clientId: clientContact.client.id,
          numberId: messageNumber.id,
          threadType: body.fromClass === 'sitter' ? 'assignment' : 'front_desk',
          status: 'active',
          participants: {
            create: [
              { participantType: 'client', participantId: clientContact.client.id },
            ],
          },
        },
      });
    }

    // Choose from number (will use thread's default or active window)
    const routingResult = await chooseFromNumber(thread.id, orgId);
    
    console.log('[Test SMS] Routing decision', {
      orgId,
      threadId: thread.id,
      chosenNumberId: routingResult.numberId,
      chosenE164: routingResult.e164,
      numberClass: routingResult.numberClass,
      requestedFromClass: body.fromClass,
    });

    // Send via provider
    const provider = await getMessagingProvider(orgId);
    const sendResult = await provider.sendMessage({
      to: normalizedPhone,
      fromE164: routingResult.e164,
      body: 'Test SMS from Snout OS messaging system',
    });
    
    console.log('[Test SMS] Send result', {
      success: sendResult.success,
      messageSid: sendResult.messageSid,
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
    });

    if (!sendResult.success) {
      return NextResponse.json({
        success: false,
        messageSid: null,
        error: sendResult.errorMessage || 'Failed to send SMS',
        errorCode: sendResult.errorCode,
        fromE164: routingResult.e164,
      }, { status: 500 });
    }

    // Create message record
    const message = await (prisma as any).message.create({
      data: {
        orgId,
        threadId: thread.id,
        direction: 'outbound',
        senderType: 'owner',
        senderId: user.id || user.email || 'system',
        body: 'Test SMS from Snout OS messaging system',
        providerMessageSid: sendResult.messageSid || null,
      },
    });

    // Create delivery record
    await (prisma as any).messageDelivery.create({
      data: {
        messageId: message.id,
        attemptNo: 1,
        status: 'sent',
        providerErrorCode: null,
        providerErrorMessage: null,
      },
    });

    return NextResponse.json({
      success: true,
      messageSid: sendResult.messageSid,
      error: null,
      errorCode: null,
      fromE164: routingResult.e164,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Test SMS] Error:', error);
    return NextResponse.json({
      success: false,
      messageSid: null,
      error: error.message || 'Failed to send test SMS',
      errorCode: null,
      fromE164: null,
    }, { status: 500 });
  }
}
