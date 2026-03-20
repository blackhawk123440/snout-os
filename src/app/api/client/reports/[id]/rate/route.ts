import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';
import { logEvent } from '@/lib/log-event';

const RateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
    requireClientContext(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = RateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify report belongs to this client
    const report = await (prisma as any).report.findFirst({
      where: {
        id,
        ...whereOrg(ctx.orgId, {}),
        booking: { clientId: ctx.clientId },
      },
      select: { id: true },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const updatedReport = await (prisma as any).report.update({
      where: { id },
      data: {
        clientRating: parsed.data.rating,
        clientFeedback: parsed.data.feedback?.trim() || null,
        ratedAt: new Date(),
      },
      select: { id: true, bookingId: true },
    });

    // Trigger review automation if rating is high enough
    if (parsed.data.rating >= 4 && updatedReport.bookingId) {
      void triggerReviewAutomation(ctx.orgId, ctx.clientId, updatedReport.bookingId, parsed.data.rating);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to rate report', message },
      { status: 500 }
    );
  }
}

/**
 * After a high rating, check review automation config and send a Google review request.
 * Runs fire-and-forget — never blocks the rating response.
 */
async function triggerReviewAutomation(orgId: string, clientId: string, bookingId: string, rating: number) {
  try {
    // Load review automation config from Setting table
    const configRow = await (prisma as any).setting.findFirst({
      where: { orgId, key: 'review_automation_config' },
    });
    if (!configRow?.value) return;

    let config: { enabled?: boolean; googlePlaceId?: string; minStarRating?: number; frequencyCapDays?: number; minVisitsBeforeAsking?: number };
    try { config = JSON.parse(configRow.value); } catch { return; }

    if (!config.enabled || !config.googlePlaceId) return;
    if (rating < (config.minStarRating ?? 4)) return;

    // Frequency cap: check if we already sent a review request to this client recently
    const capDays = config.frequencyCapDays ?? 30;
    const cutoff = new Date(Date.now() - capDays * 24 * 60 * 60 * 1000);
    const recentRequest = await (prisma as any).eventLog.findFirst({
      where: {
        orgId,
        action: 'review_request.sent',
        createdAt: { gte: cutoff },
        metadata: { contains: clientId },
      },
    });
    if (recentRequest) return;

    // Minimum visits check
    const minVisits = config.minVisitsBeforeAsking ?? 3;
    const completedCount = await (prisma as any).booking.count({
      where: { orgId, clientId, status: 'completed' },
    });
    if (completedCount < minVisits) return;

    // Get client phone for SMS
    const client = await (prisma as any).client.findUnique({
      where: { id: clientId },
      select: { phone: true, firstName: true },
    });
    if (!client?.phone) return;

    // Get first pet name for personalization
    const booking = await (prisma as any).booking.findUnique({
      where: { id: bookingId },
      select: { pets: { select: { name: true }, take: 1 } },
    });
    const petName = booking?.pets?.[0]?.name || 'your pet';

    // Send the review request via SMS (delayed 1 hour via automation queue)
    const reviewUrl = `https://search.google.com/local/writereview?placeid=${config.googlePlaceId}`;
    const msg = `Thanks for trusting us with ${petName}! If you had a great experience, we'd love a Google review: ${reviewUrl}`;

    try {
      const { enqueueAutomation } = await import('@/lib/automation-queue');
      await enqueueAutomation(
        'reviewRequest',
        'client',
        { orgId, clientId, bookingId, phone: client.phone, message: msg },
        `reviewRequest:client:${clientId}:${bookingId}`,
      );
    } catch {
      // Fallback: send immediately if queue unavailable
      const { guardedSend } = await import('@/lib/messaging-guard');
      const { sendMessage } = await import('@/lib/message-utils');
      await guardedSend(orgId, 'review_request', async () => {
        await sendMessage(client.phone, msg);
        return true;
      });
    }

    await logEvent({
      orgId,
      action: 'review_request.sent',
      status: 'success',
      metadata: { clientId, bookingId, rating },
    }).catch(() => {});
  } catch (err) {
    console.error('[review-automation] Trigger failed:', err);
  }
}
