/**
 * Accept Booking Request API Route
 * 
 * POST: Accept a booking request from a pool offer
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
    const offer = await (prisma as any).sitterPoolOffer.findFirst({
      where: {
        bookingId: bookingId,
        OR: [
          { sitterId: sitterId },
          { sitterIds: { contains: sitterId } },
        ],
        status: 'active',
        expiresAt: { gt: new Date() },
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

    // Add acceptance response
    responses.push({ sitterId, response: 'accepted' });
    
    // Update offer with response and mark as accepted
    await (prisma as any).sitterPoolOffer.update({
      where: { id: offer.id },
      data: {
        responses: JSON.stringify(responses),
        acceptedSitterId: sitterId,
        status: 'accepted',
      },
    });

    // Assign booking to sitter
    await (prisma as any).booking.update({
      where: { id: bookingId },
      data: {
        sitterId: sitterId,
        status: 'confirmed',
        assignmentType: 'pool',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Accept Booking API] Failed to accept booking:', error);
    return NextResponse.json(
      { error: 'Failed to accept booking', message: error.message },
      { status: 500 }
    );
  }
}
