/**
 * Conversation Messages API
 * 
 * GET /api/conversations/[phone] - Get all messages in a conversation
 * POST /api/conversations/[phone] - Send a message in a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/message-utils";
import { getPhoneForViewer, getBookingParticipantPhone } from "@/lib/masked-numbers";
import { formatPhoneForAPI } from "@/lib/phone-format";

/**
 * GET /api/conversations/[phone]
 * Get all messages in a conversation with a specific phone number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') || 'owner';
    const bookingId = searchParams.get('bookingId');

    // Decode phone number (it's URL encoded)
    const decodedPhone = decodeURIComponent(phone);

    // Find all messages with this phone number
    const where: any = {
      OR: [
        { from: decodedPhone },
        { to: decodedPhone },
      ],
    };

    if (bookingId) {
      where.bookingId = bookingId;
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        booking: {
          include: {
            sitter: true,
            client: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Format messages with masked numbers
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      direction: msg.direction,
      from: getPhoneForViewer(msg.from, role as 'owner' | 'sitter' | 'client'),
      to: getPhoneForViewer(msg.to, role as 'owner' | 'sitter' | 'client'),
      body: msg.body,
      status: msg.status,
      bookingId: msg.bookingId,
      createdAt: msg.createdAt,
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error("[GET /api/conversations/[phone]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/[phone]
 * Send a message in a conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const body = await request.json();
    const { message, bookingId, role, sitterId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Decode phone number
    const decodedPhone = decodeURIComponent(phone);
    const formattedPhone = formatPhoneForAPI(decodedPhone);

    if (!formattedPhone) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    // Get the real phone number for routing (internal use)
    let realPhone = decodedPhone;
    if (bookingId) {
      // Determine if we're messaging a client or sitter
      const participantType = role === 'sitter' ? 'client' : 'sitter';
      const participantPhone = await getBookingParticipantPhone(bookingId, participantType);
      if (participantPhone) {
        realPhone = participantPhone;
      }
    }

    // Send the message
    const sent = await sendMessage(realPhone, message, bookingId || undefined);

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("[POST /api/conversations/[phone]] Error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

