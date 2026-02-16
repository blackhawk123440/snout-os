/**
 * Message Event SRS Processing Endpoint
 * 
 * POST /api/messages/process-srs
 * 
 * Processes a MessageEvent for SRS responsiveness tracking
 * Call this after creating a MessageEvent (from webhook or send endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { onMessageEventCreated } from '@/lib/tiers/event-hooks';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgId,
      threadId,
      messageEventId,
      direction,
      actorType,
      messageBody,
      hasPolicyViolation,
      createdAt,
    } = body;

    if (!orgId || !threadId || !messageEventId || !direction || !actorType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await onMessageEventCreated(orgId, threadId, messageEventId, {
      direction,
      actorType,
      body: messageBody || '',
      hasPolicyViolation: hasPolicyViolation || false,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Message SRS Processing] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message for SRS', message: error.message },
      { status: 500 }
    );
  }
}
