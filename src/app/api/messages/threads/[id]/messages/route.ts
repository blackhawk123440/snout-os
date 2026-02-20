/**
 * Get Messages for Thread Route
 * 
 * GET /api/messages/threads/[id]/messages
 * Proxies to NestJS API to get messages for a thread.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { prisma } from '@/lib/db';
import { chooseFromNumber } from '@/lib/messaging/choose-from-number';
import { getMessagingProvider } from '@/lib/messaging/provider-factory';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: 'API server not configured' },
      { status: 500 }
    );
  }

  const params = await context.params;
  const threadId = params.id;

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let apiToken: string;
  try {
    const user = session.user as any;
    apiToken = await mintApiJWT({
      userId: user.id || user.email || '',
      orgId: user.orgId || 'default',
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

  // API endpoint: GET /api/messages/threads/:threadId
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
    let responseData: any;
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      console.error('[BFF Proxy] API error response:', responseData);
      return NextResponse.json(responseData, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/json',
        },
      });
    }

    // API returns messages array directly
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[BFF Proxy] Failed to forward messages request:', error);
    return NextResponse.json(
      { error: 'Failed to reach API server', message: error.message },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const threadId = params.id;

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

  // Fallback: Direct Prisma implementation
  try {
    // Load thread with relationships
    const thread = await (prisma as any).thread.findUnique({
      where: { id: threadId },
      include: {
        messageNumber: true,
        client: {
          include: { contacts: true },
        },
        sitter: true,
        assignmentWindows: {
          where: {
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
          include: {
            sitter: {
              include: {
                assignedNumbers: {
                  where: {
                    status: 'active',
                    class: 'sitter',
                  },
                },
              },
            },
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

    // CRITICAL: If sender is a sitter, check assignment window
    if (user.sitterId) {
      const now = new Date();
      const activeWindow = thread.assignmentWindows?.[0];
      
      if (!activeWindow || activeWindow.sitterId !== user.sitterId) {
        console.log('[Send Message] Sitter blocked - no active window', {
          sitterId: user.sitterId,
          threadId,
          hasWindow: !!activeWindow,
          windowSitterId: activeWindow?.sitterId,
        });
        
        return NextResponse.json(
          { 
            error: 'Cannot send message outside active assignment window',
            code: 'WINDOW_NOT_ACTIVE',
          },
          { status: 403 }
        );
      }

      // Check window is actually active (time-based)
      if (now < activeWindow.startsAt || now > activeWindow.endsAt) {
        console.log('[Send Message] Sitter blocked - window not active', {
          sitterId: user.sitterId,
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
    }

    // Choose from number using unified routing function
    const routingResult = await chooseFromNumber(threadId, orgId);
    
    // Log routing decision
    console.log('[Send Message] Routing decision', {
      orgId,
      threadId,
      chosenNumberId: routingResult.numberId,
      chosenE164: routingResult.e164,
      numberClass: routingResult.numberClass,
      reason: routingResult.reason,
      windowId: routingResult.windowId,
      routingTrace: routingResult.routingTrace,
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
      fromNumberSid: undefined, // Not needed when E164 is provided
      body: messageBody,
    });
    
    // Log send result
    console.log('[Send Message] Twilio send result', {
      orgId,
      threadId,
      to: clientContact.e164,
      from: routingResult.e164,
      success: sendResult.success,
      messageSid: sendResult.messageSid,
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
    });

    if (!sendResult.success) {
      // Create failed message record
      const message = await (prisma as any).message.create({
        data: {
          orgId,
          threadId,
          direction: 'outbound',
          senderType,
          senderId,
          body: messageBody,
          providerMessageSid: null,
        },
      });

      return NextResponse.json(
        { 
          messageId: message.id,
          hasPolicyViolation: false,
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
        senderType,
        senderId,
        body: messageBody,
        providerMessageSid: sendResult.messageSid || null,
      },
    });

    // Update thread activity
    await (prisma as any).thread.update({
      where: { id: threadId },
      data: {
        lastActivityAt: new Date(),
        lastOutboundAt: new Date(),
      },
    });

    return NextResponse.json({
      messageId: message.id,
      providerMessageSid: sendResult.messageSid,
      hasPolicyViolation: false,
    }, {
      status: 200,
      headers: {
        'X-Snout-Route': 'prisma-fallback',
        'X-Snout-OrgId': orgId,
      },
    });
  } catch (error: any) {
    console.error('[Direct Prisma] Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}
