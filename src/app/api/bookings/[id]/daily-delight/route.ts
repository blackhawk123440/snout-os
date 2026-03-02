import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/ai';
import { getScopedDb } from '@/lib/tenancy';
import { publish, channels } from '@/lib/realtime/bus';
import { getRequestContext } from '@/lib/request-context';
import { requireAnyRole, assertOrgAccess, ForbiddenError } from '@/lib/rbac';

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
  let body: {
    petId?: string;
    tone?: 'warm' | 'playful' | 'professional';
    mediaUrls?: string[];
    /** If provided, use this instead of AI generation (offline sync flow) */
    report?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const mediaUrls = Array.isArray(body.mediaUrls)
    ? body.mediaUrls.filter((u): u is string => typeof u === 'string').slice(0, 5)
    : [];

  const db = getScopedDb(ctx);
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { pets: true, client: true },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  try {
    assertOrgAccess(booking.orgId, ctx.orgId);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (ctx.role === 'sitter' && ctx.sitterId && booking.sitterId !== ctx.sitterId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const petId = body.petId ?? booking.pets?.[0]?.id;
  if (!petId && !body.report) {
    return NextResponse.json(
      { error: 'No pets on this booking' },
      { status: 400 }
    );
  }

  const report = typeof body.report === 'string' && body.report.trim()
    ? body.report.trim()
    : await ai.generateDailyDelight(petId!, bookingId, body.tone);

  // Persist to Report so client portal can display it
  if (report) {
    try {
      await db.report.create({
        data: {
          bookingId,
          content: report,
          mediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
        },
      });
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        select: { sitterId: true, orgId: true },
      });
      if (booking?.sitterId) {
        publish(channels.sitterToday(booking.orgId ?? 'default', booking.sitterId), {
          type: 'delight.created',
          bookingId,
          ts: Date.now(),
        }).catch(() => {});
      }
    } catch (e) {
      console.error('[daily-delight] Failed to create Report (non-blocking):', e);
    }
  }

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
