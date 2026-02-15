/**
 * Decline Booking Request API Route
 * 
 * POST: Decline a booking request from a pool offer
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const resolvedParams = await params;
    const sitterId = resolvedParams.id;
    const bookingId = resolvedParams.bookingId;

    // Find the active pool offer for this booking and sitter
    const offer = await prisma.sitterPoolOffer.findFirst({
      where: {
        bookingId: bookingId,
        OR: [
          { sitterId: sitterId },
          { sitterIds: { contains: sitterId } },
        ],
        status: 'active',
      },
    });

    if (!offer) {
      return NextResponse.json(
        { error: 'No active offer found for this booking' },
        { status: 404 }
      );
    }

    // Check if already responded
    const responses = JSON.parse(offer.responses || '[]') as Array<{ sitterId: string; response: string }>;
    if (responses.some(r => r.sitterId === sitterId)) {
      return NextResponse.json(
        { error: 'You have already responded to this offer' },
        { status: 400 }
      );
    }

    // Add decline response
    responses.push({ sitterId, response: 'declined' });
    
    // Update offer with response
    await prisma.sitterPoolOffer.update({
      where: { id: offer.id },
      data: {
        responses: JSON.stringify(responses),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Decline Booking API] Failed to decline booking:', error);
    return NextResponse.json(
      { error: 'Failed to decline booking', message: error.message },
      { status: 500 }
    );
  }
}
