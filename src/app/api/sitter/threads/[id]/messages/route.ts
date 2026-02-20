/**
 * Sitter Send Message Route
 * 
 * POST /api/sitter/threads/:id/messages
 * Sends a message as a sitter (only during active assignment window)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { chooseFromNumber } from '@/lib/messaging/choose-from-number';
import { getMessagingProvider } from '@/lib/messaging/provider-factory';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = session.user as any;
  
  // Must be a sitter
  if (!user.sitterId) {
    return NextResponse.json(
      { error: 'Sitter access required' },
      { status: 403 }
    );
  }

  const orgId = user.orgId || 'default';
  const sitterId = user.sitterId;
  const params = await context.params;
  const threadId = params.id;

  let body: { body: string };
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
      { error: 'Message body is required' },
      { status: 400 }
    );
  }

  try {
    // Load thread with assignment windows
    const thread = await (prisma as any).thread.findUnique({
      where: { id: threadId },
      include: {
        client: {
          include: { contacts: true },
        },
        assignmentWindows: {
          where: {
            sitterId,
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Check org scoping
    if (thread.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // CRITICAL: Check assignment window is active
    const now = new Date();
    const activeWindow = thread.assignmentWindows?.[0];
    
    if (!activeWindow) {
      console.log('[Sitter Send] Blocked - no assignment window', {
        sitterId,
        threadId,
      });
      
      return NextResponse.json(
        { 
          error: 'No assignment window found for this thread',
          code: 'NO_WINDOW',
        },
        { status: 403 }
      );
    }

    if (activeWindow.sitterId !== sitterId) {
      console.log('[Sitter Send] Blocked - window belongs to different sitter', {
        sitterId,
        threadId,
        windowSitterId: activeWindow.sitterId,
      });
      
      return NextResponse.json(
        { 
          error: 'This thread is not assigned to you',
          code: 'WRONG_SITTER',
        },
        { status: 403 }
      );
    }

    // Check window is actually active (time-based)
    if (now < activeWindow.startsAt || now > activeWindow.endsAt) {
      console.log('[Sitter Send] Blocked - window not active', {
        sitterId,
        threadId,
        now: now.toISOString(),
        windowStart: activeWindow.startsAt.toISOString(),
        windowEnd: activeWindow.endsAt.toISOString(),
      });
      
      return NextResponse.json(
        { 
          error: 'Assignment window is not active. Messages can only be sent during active assignment windows.',
          code: 'WINDOW_NOT_ACTIVE',
          windowStartsAt: activeWindow.startsAt.toISOString(),
          windowEndsAt: activeWindow.endsAt.toISOString(),
        },
        { status: 403 }
      );
    }

    // Choose from number (will use sitter's masked number during active window)
    const routingResult = await chooseFromNumber(threadId, orgId, now);
    
    // Log routing decision
    console.log('[Sitter Send] Routing decision', {
      orgId,
      sitterId,
      threadId,
      chosenNumberId: routingResult.numberId,
      chosenE164: routingResult.e164,
      numberClass: routingResult.numberClass,
      windowId: routingResult.windowId,
      reason: routingResult.reason,
    });

    // Get recipient E164
    const clientContact = thread.client.contacts?.[0];
    if (!clientContact?.e164) {
      return NextResponse.json(
        { error: 'Client contact not found' },
        { status: 400 }
      );
    }

    // Send via provider with explicit E164
    const provider = await getMessagingProvider(orgId);
    const sendResult = await provider.sendMessage({
      to: clientContact.e164,
      fromE164: routingResult.e164, // Use actual E164 from chosen number
      body: messageBody,
    });
    
    // Log send result
    console.log('[Sitter Send] Twilio send result', {
      orgId,
      sitterId,
      threadId,
      to: clientContact.e164,
      from: routingResult.e164,
      success: sendResult.success,
      messageSid: sendResult.messageSid,
      errorCode: sendResult.errorCode,
    });

    if (!sendResult.success) {
      // Create failed message record
      const message = await (prisma as any).message.create({
        data: {
          orgId,
          threadId,
          direction: 'outbound',
          senderType: 'sitter',
          senderId: sitterId,
          body: messageBody,
          providerMessageSid: null,
        },
      });

      return NextResponse.json(
        { 
          messageId: message.id,
          error: sendResult.errorMessage || 'Failed to send message',
        },
        { status: 500 }
      );
    }

    // Create successful message record
    const message = await (prisma as any).message.create({
      data: {
        orgId,
        threadId,
        direction: 'outbound',
        senderType: 'sitter',
        senderId: sitterId,
        body: messageBody,
        providerMessageSid: sendResult.messageSid || null,
      },
    });

    // Update thread activity
    await (prisma as any).thread.update({
      where: { id: threadId },
      data: {
        lastActivityAt: new Date(),
      },
    });

    return NextResponse.json({
      messageId: message.id,
      providerMessageSid: sendResult.messageSid,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Sitter Send] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}
