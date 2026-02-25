import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ai } from '@/lib/ai';
import { prisma } from '@/lib/db';

/**
 * POST /api/bookings/[id]/daily-delight
 * Generate and store an AI Daily Delight report for a pet on this booking.
 * Body: { petId?: string } — if omitted, uses the booking's first pet.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: bookingId } = await params;
  let body: { petId?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { pets: true },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const petId = body.petId ?? booking.pets?.[0]?.id;
  if (!petId) {
    return NextResponse.json(
      { error: 'No pets on this booking' },
      { status: 400 }
    );
  }

  const report = await ai.generateDailyDelight(petId, bookingId);
  return NextResponse.json({ report });
}
