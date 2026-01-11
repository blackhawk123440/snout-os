/**
 * Conversations API
 * 
 * Manages conversation threads between clients, sitters, and owner
 * - Owner sees all conversations
 * - Sitters see only their conversations
 * - Clients see only their conversations (future)
 * - All numbers are masked except for owner
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPhoneForViewer } from "@/lib/masked-numbers";

interface Conversation {
  id: string;
  participantName: string;
  participantPhone: string; // Masked for non-owners
  participantType: 'client' | 'sitter';
  bookingId: string | null;
  bookingTitle: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  messageCount: number;
}

/**
 * GET /api/conversations
 * Get all conversations for the current user
 * Query params:
 * - role: 'owner' | 'sitter' | 'client'
 * - sitterId: (required if role is 'sitter')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') || 'owner';
    const sitterId = searchParams.get('sitterId');

    if (role === 'sitter' && !sitterId) {
      return NextResponse.json(
        { error: "sitterId is required for sitter role" },
        { status: 400 }
      );
    }

    let conversations: Conversation[] = [];

    if (role === 'owner') {
      // Owner sees all conversations grouped by participant
      const messages = await prisma.message.findMany({
        where: {
          direction: 'inbound', // Only inbound messages create conversations
        },
        include: {
          booking: {
            include: {
              sitter: true,
              client: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Group messages by participant phone number
      const conversationMap = new Map<string, Conversation>();

      for (const message of messages) {
        const participantPhone = message.from;
        
        // Determine participant type and name
        let participantName = participantPhone;
        let participantType: 'client' | 'sitter' = 'client';
        let bookingId = message.bookingId;
        let bookingTitle: string | null = null;

        // Check if this is from a sitter
        if (message.booking?.sitter) {
          const sitterPhone = message.booking.sitter.openphonePhone || 
                             message.booking.sitter.personalPhone || 
                             message.booking.sitter.phone;
          
          if (sitterPhone === participantPhone) {
            participantName = `${message.booking.sitter.firstName} ${message.booking.sitter.lastName}`;
            participantType = 'sitter';
          }
        }

        // Check if this is from a client
        if (participantType === 'client' && message.booking) {
          participantName = `${message.booking.firstName} ${message.booking.lastName}`;
          bookingTitle = `${message.booking.service} - ${new Date(message.booking.startAt).toLocaleDateString()}`;
        }

        if (!conversationMap.has(participantPhone)) {
          conversationMap.set(participantPhone, {
            id: participantPhone, // Use phone as ID for grouping
            participantName,
            participantPhone: getPhoneForViewer(participantPhone, 'owner'),
            participantType,
            bookingId,
            bookingTitle,
            lastMessage: message.body,
            lastMessageAt: message.createdAt,
            unreadCount: message.status === 'delivered' ? 1 : 0,
            messageCount: 1,
          });
        } else {
          const existing = conversationMap.get(participantPhone)!;
          if (message.createdAt > existing.lastMessageAt) {
            existing.lastMessage = message.body;
            existing.lastMessageAt = message.createdAt;
          }
          existing.messageCount++;
          if (message.status === 'delivered') {
            existing.unreadCount++;
          }
        }
      }

      conversations = Array.from(conversationMap.values());

    } else if (role === 'sitter' && sitterId) {
      // Sitter sees only conversations for their bookings
      const sitter = await prisma.sitter.findUnique({
        where: { id: sitterId },
        include: {
          bookings: {
            include: {
              messages: {
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          },
        },
      });

      if (!sitter) {
        return NextResponse.json(
          { error: "Sitter not found" },
          { status: 404 }
        );
      }

      // Group messages by booking/client
      const conversationMap = new Map<string, Conversation>();

      for (const booking of sitter.bookings) {
        for (const message of booking.messages) {
          // Only show messages from clients (inbound) or to clients (outbound)
          if (message.direction === 'inbound') {
            const participantPhone = message.from;
            const participantName = `${booking.firstName} ${booking.lastName}`;
            const bookingTitle = `${booking.service} - ${new Date(booking.startAt).toLocaleDateString()}`;

            if (!conversationMap.has(participantPhone)) {
              conversationMap.set(participantPhone, {
                id: `${booking.id}-${participantPhone}`,
                participantName,
                participantPhone: getPhoneForViewer(participantPhone, 'sitter'),
                participantType: 'client',
                bookingId: booking.id,
                bookingTitle,
                lastMessage: message.body,
                lastMessageAt: message.createdAt,
                unreadCount: message.status === 'delivered' ? 1 : 0,
                messageCount: 1,
              });
            } else {
              const existing = conversationMap.get(participantPhone)!;
              if (message.createdAt > existing.lastMessageAt) {
                existing.lastMessage = message.body;
                existing.lastMessageAt = message.createdAt;
              }
              existing.messageCount++;
              if (message.status === 'delivered') {
                existing.unreadCount++;
              }
            }
          }
        }
      }

      conversations = Array.from(conversationMap.values());
    }

    // Sort by last message time (newest first)
    conversations.sort((a, b) => 
      b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[GET /api/conversations] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}


