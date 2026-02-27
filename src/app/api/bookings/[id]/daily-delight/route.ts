import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/ai';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireAnyRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

/**
 * POST /api/bookings/[id]/daily-delight
 * Generate and store an AI Daily Delight report for a pet on this booking.
 * Optionally sends the report via SMS to the client (when Twilio is configured).
 * Body: { petId?: string } — if omitted, uses the booking's first pet.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireAnyRole(ctx, ['owner', 'admin', 'sitter']);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: bookingId } = await params;
  let body: { petId?: string; tone?: 'warm' | 'playful' | 'professional' } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const booking = await prisma.booking.findUnique({
    where: whereOrg(ctx.orgId, { id: bookingId }),
    include: { pets: true, client: true },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (ctx.role === 'sitter' && ctx.sitterId && booking.sitterId !== ctx.sitterId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const petId = body.petId ?? booking.pets?.[0]?.id;
  if (!petId) {
    return NextResponse.json(
      { error: 'No pets on this booking' },
      { status: 400 }
    );
  }

  const report = await ai.generateDailyDelight(petId, bookingId, body.tone);

  // Auto-send report via SMS when Twilio is configured
  const client = booking.client;
  const clientPhone = client?.phone?.trim();
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && fromNumber && clientPhone && report) {
    try {
      const twilio = require('twilio') as typeof import('twilio');
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (authToken) {
        const clientName = client
          ? `${client.firstName} ${client.lastName}`.trim() || 'Your sitter'
          : 'Your sitter';
        const smsBody = `🐾 Daily Delight from ${clientName}'s sitter:\n\n${report}\n\n- Snout OS`;
        const twilioClient = twilio(accountSid, authToken);
        await twilioClient.messages.create({
          body: smsBody,
          from: fromNumber,
          to: clientPhone.startsWith('+') ? clientPhone : `+1${clientPhone.replace(/\D/g, '')}`,
        });
      }
    } catch (e) {
      console.error('[daily-delight] SMS send failed (non-blocking):', e);
    }
  }

  return NextResponse.json({ report });
}
