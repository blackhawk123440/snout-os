/**
 * Send Message API
 * 
 * Sends SMS messages via the messaging system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/message-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, to, message, direction = 'outbound' } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Recipient phone number and message are required' },
        { status: 400 }
      );
    }

    const sent = await sendMessage(to, message, bookingId);

    if (sent) {
      return NextResponse.json({
        success: true,
        message: 'Message sent successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send message' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      },
      { status: 500 }
    );
  }
}

