/**
 * Centralized notification triggers.
 * Every function is fire-and-forget — never throws, never blocks the caller.
 * Each checks OrgNotificationSettings before sending.
 */

import { prisma } from '@/lib/db';
import { logEvent } from '@/lib/log-event';
import { publish, channels } from '@/lib/realtime/bus';
import { sendEmail } from '@/lib/email';
import { bookingConfirmationEmail } from '@/lib/email-templates';

// ─── Helpers ─────────────────────────────────────────────────────────

async function getNotifSettings(orgId: string) {
  return (prisma as any).orgNotificationSettings.findFirst({
    where: { orgId },
  });
}

async function findThreadForClient(orgId: string, clientId: string): Promise<string | null> {
  const thread = await (prisma as any).messageThread.findFirst({
    where: { orgId, clientId },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });
  return thread?.id ?? null;
}

async function findThreadForSitter(orgId: string, sitterId: string): Promise<string | null> {
  const thread = await (prisma as any).messageThread.findFirst({
    where: { orgId, assignedSitterId: sitterId },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });
  return thread?.id ?? null;
}

async function trySendThreadMessage(params: {
  orgId: string;
  threadId: string;
  body: string;
}): Promise<void> {
  // Dynamic import to avoid circular deps
  const { sendThreadMessage } = await import('@/lib/messaging/send');
  await sendThreadMessage({
    orgId: params.orgId,
    threadId: params.threadId,
    body: params.body,
    actor: { role: 'system' },
  });
}

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const fmtTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// ─── N1: Booking Created → Client SMS (G1) ──────────────────────────

export async function notifyClientBookingReceived(params: {
  orgId: string;
  bookingId: string;
  clientId: string;
  clientFirstName: string;
  service: string;
  startAt: Date | string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.clientReminders) return;

    const threadId = await findThreadForClient(params.orgId, params.clientId);
    if (!threadId) return;

    const body = `Hi ${params.clientFirstName}, Snout has received your booking request for ${params.service} on ${fmtDate(params.startAt)}! We'll review it and get back to you shortly.`;
    await trySendThreadMessage({ orgId: params.orgId, threadId, body });

    // Also send email if client has an email address (fire-and-forget)
    const client = await (prisma as any).client.findFirst({
      where: { id: params.clientId },
      select: { email: true },
    });
    if (client?.email) {
      const emailTemplate = bookingConfirmationEmail({
        clientName: params.clientFirstName,
        service: params.service,
        date: fmtDate(params.startAt),
        time: fmtTime(params.startAt),
      });
      void sendEmail({ to: client.email, ...emailTemplate }).catch(() => {});
    }

    await logEvent({
      orgId: params.orgId,
      action: 'notification.client.booking_received',
      bookingId: params.bookingId,
      status: 'success',
    });
  } catch (error) {
    console.error('[notification] clientBookingReceived failed:', error);
  }
}

// ─── N2: Booking Created → Owner Alert (G2) ─────────────────────────

export async function notifyOwnerNewBooking(params: {
  orgId: string;
  bookingId: string;
  clientName: string;
  service: string;
  startAt: Date | string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.ownerAlerts) return;

    // Publish SSE event for live dashboard update
    publish(channels.ownerOps(params.orgId), {
      type: 'booking.created',
      bookingId: params.bookingId,
      clientName: params.clientName,
      service: params.service,
      ts: Date.now(),
    }).catch(() => {});

    await logEvent({
      orgId: params.orgId,
      action: 'notification.owner.new_booking',
      bookingId: params.bookingId,
      status: 'success',
      metadata: { clientName: params.clientName, service: params.service },
    });
  } catch (error) {
    console.error('[notification] ownerNewBooking failed:', error);
  }
}

// ─── N3: Pool Offer Filled → Other Sitters (G5) ─────────────────────

export async function notifyPoolSittersOfferFilled(params: {
  orgId: string;
  bookingId: string;
  acceptedSitterId: string;
  service: string;
  startAt: Date | string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.sitterNotifications) return;

    // Find other sitters who were offered this booking
    const offers = await (prisma as any).offerEvent?.findMany?.({
      where: {
        orgId: params.orgId,
        bookingId: params.bookingId,
        sitterId: { not: params.acceptedSitterId },
        status: { in: ['pending', 'sent'] },
      },
      select: { sitterId: true },
    }) ?? [];

    const body = `The ${params.service} booking for ${fmtDate(params.startAt)} has been filled. Thanks for your availability!`;

    for (const offer of offers) {
      if (!offer.sitterId) continue;
      const threadId = await findThreadForSitter(params.orgId, offer.sitterId);
      if (threadId) {
        await trySendThreadMessage({ orgId: params.orgId, threadId, body }).catch(() => {});
      }
    }

    await logEvent({
      orgId: params.orgId,
      action: 'notification.pool.offer_filled',
      bookingId: params.bookingId,
      status: 'success',
    });
  } catch (error) {
    console.error('[notification] poolSittersOfferFilled failed:', error);
  }
}

// ─── N4: Payment Received → Sitter (G7) ─────────────────────────────

export async function notifySitterPaymentReceived(params: {
  orgId: string;
  bookingId: string;
  sitterId: string;
  clientName: string;
  service: string;
  startAt: Date | string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.sitterNotifications) return;

    const threadId = await findThreadForSitter(params.orgId, params.sitterId);
    if (!threadId) return;

    const body = `Payment received for your upcoming ${params.service} visit with ${params.clientName} on ${fmtDate(params.startAt)}. You're all set!`;
    await trySendThreadMessage({ orgId: params.orgId, threadId, body });

    await logEvent({
      orgId: params.orgId,
      action: 'notification.sitter.payment_received',
      bookingId: params.bookingId,
      status: 'success',
    });
  } catch (error) {
    console.error('[notification] sitterPaymentReceived failed:', error);
  }
}

// ─── N5: Booking Cancelled → Sitter (G14) ───────────────────────────

export async function notifySitterBookingCancelled(params: {
  orgId: string;
  bookingId: string;
  sitterId: string;
  clientName: string;
  service: string;
  startAt: Date | string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.sitterNotifications) return;

    const threadId = await findThreadForSitter(params.orgId, params.sitterId);
    if (!threadId) return;

    const body = `${params.clientName}'s ${params.service} on ${fmtDate(params.startAt)} has been cancelled.`;
    await trySendThreadMessage({ orgId: params.orgId, threadId, body });

    await logEvent({
      orgId: params.orgId,
      action: 'notification.sitter.booking_cancelled',
      bookingId: params.bookingId,
      status: 'success',
    });
  } catch (error) {
    console.error('[notification] sitterBookingCancelled failed:', error);
  }
}

// ─── N6: Sitter Changed → Client (G16) ──────────────────────────────

export async function notifyClientSitterChanged(params: {
  orgId: string;
  bookingId: string;
  clientId: string;
  newSitterName: string;
  service: string;
  startAt: Date | string;
  petNames: string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.clientReminders) return;

    const threadId = await findThreadForClient(params.orgId, params.clientId);
    if (!threadId) return;

    const petPart = params.petNames ? ` They'll take great care of ${params.petNames}!` : '';
    const body = `Your sitter for ${params.service} on ${fmtDate(params.startAt)} has been updated to ${params.newSitterName}.${petPart}`;
    await trySendThreadMessage({ orgId: params.orgId, threadId, body });

    await logEvent({
      orgId: params.orgId,
      action: 'notification.client.sitter_changed',
      bookingId: params.bookingId,
      status: 'success',
    });
  } catch (error) {
    console.error('[notification] clientSitterChanged failed:', error);
  }
}

// ─── N7: Welcome Message → New Client (G23) ─────────────────────────

export async function notifyClientWelcome(params: {
  orgId: string;
  clientId: string;
  clientFirstName: string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.clientReminders) return;

    const threadId = await findThreadForClient(params.orgId, params.clientId);
    if (!threadId) return;

    const body = `Welcome to Snout, ${params.clientFirstName}! We're excited to care for your pets. Complete your pet profiles in your portal for the best experience.`;
    await trySendThreadMessage({ orgId: params.orgId, threadId, body });

    await logEvent({
      orgId: params.orgId,
      action: 'notification.client.welcome',
      status: 'success',
      metadata: { clientId: params.clientId },
    });
  } catch (error) {
    console.error('[notification] clientWelcome failed:', error);
  }
}

// ─── N8: Medication Missed Alert → Owner (G55) ──────────────────────

export async function notifyOwnerMedicationMissed(params: {
  orgId: string;
  bookingId: string;
  sitterName: string;
  petName: string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.ownerAlerts) return;

    publish(channels.ownerOps(params.orgId), {
      type: 'medication.missed',
      bookingId: params.bookingId,
      sitterName: params.sitterName,
      petName: params.petName,
      ts: Date.now(),
    }).catch(() => {});

    await logEvent({
      orgId: params.orgId,
      action: 'notification.owner.medication_missed',
      bookingId: params.bookingId,
      status: 'success',
      metadata: { sitterName: params.sitterName, petName: params.petName },
    });
  } catch (error) {
    console.error('[notification] ownerMedicationMissed failed:', error);
  }
}

// ─── N10: Health Concern → Owner (G63) ───────────────────────────────

export async function notifyOwnerHealthConcern(params: {
  orgId: string;
  petId: string;
  petName: string;
  sitterName: string;
  note: string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.ownerAlerts) return;

    const preview = params.note.length > 80 ? params.note.slice(0, 80) + '...' : params.note;

    publish(channels.ownerOps(params.orgId), {
      type: 'health.concern',
      petName: params.petName,
      sitterName: params.sitterName,
      note: preview,
      ts: Date.now(),
    }).catch(() => {});

    await logEvent({
      orgId: params.orgId,
      action: 'notification.owner.health_concern',
      status: 'success',
      metadata: { petName: params.petName, sitterName: params.sitterName, note: preview },
    });
  } catch (error) {
    console.error('[notification] ownerHealthConcern failed:', error);
  }
}

// ─── N11: Tier Promotion → Sitter (G72) ─────────────────────────────

export async function notifySitterTierPromotion(params: {
  orgId: string;
  sitterId: string;
  tierName: string;
  commissionPercentage: number;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.sitterNotifications) return;

    const threadId = await findThreadForSitter(params.orgId, params.sitterId);
    if (!threadId) return;

    const body = `Congratulations! You've been promoted to ${params.tierName}! Your new commission rate is ${params.commissionPercentage}%.`;
    await trySendThreadMessage({ orgId: params.orgId, threadId, body });

    await logEvent({
      orgId: params.orgId,
      action: 'notification.sitter.tier_promoted',
      status: 'success',
      metadata: { sitterId: params.sitterId, tierName: params.tierName },
    });
  } catch (error) {
    console.error('[notification] sitterTierPromotion failed:', error);
  }
}

// ─── N12: Sitter Check-In → Client SMS (G75) ────────────────────────

export async function notifyClientSitterCheckedIn(params: {
  orgId: string;
  bookingId: string;
  clientId: string;
  sitterName: string;
  petNames: string;
  service: string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.clientReminders) return;

    const threadId = await findThreadForClient(params.orgId, params.clientId);
    if (!threadId) return;

    const petPart = params.petNames || 'your pet';
    const body = `Your sitter ${params.sitterName} has arrived and started ${petPart}'s ${params.service}! We'll send you an update when the visit is complete.`;
    await trySendThreadMessage({ orgId: params.orgId, threadId, body });

    await logEvent({
      orgId: params.orgId,
      action: 'notification.client.sitter_checked_in',
      bookingId: params.bookingId,
      status: 'success',
    });
  } catch (error) {
    console.error('[notification] clientSitterCheckedIn failed:', error);
  }
}

// ─── N13: Sitter Assigned → Sitter SMS (S1.9) ───────────────────────

export async function notifySitterAssigned(params: {
  orgId: string;
  bookingId: string;
  sitterId: string;
  sitterFirstName: string;
  clientName: string;
  service: string;
  startAt: Date | string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.sitterNotifications) return;

    const threadId = await findThreadForSitter(params.orgId, params.sitterId);
    if (!threadId) return;

    const body = `Great! You're assigned to ${params.service} for ${params.clientName} on ${fmtDate(params.startAt)}. Check your portal for details.`;
    await trySendThreadMessage({ orgId: params.orgId, threadId, body });

    await logEvent({
      orgId: params.orgId,
      action: 'notification.sitter.assigned',
      bookingId: params.bookingId,
      status: 'success',
    });
  } catch (error) {
    console.error('[notification] sitterAssigned failed:', error);
  }
}

// ─── N14: Owner Pool Accepted → Owner SSE (S1.10) ───────────────────

export async function notifyOwnerPoolAccepted(params: {
  orgId: string;
  bookingId: string;
  sitterName: string;
  clientName: string;
  service: string;
  startAt: Date | string;
}): Promise<void> {
  try {
    const settings = await getNotifSettings(params.orgId);
    if (settings && !settings.ownerAlerts) return;

    publish(channels.ownerOps(params.orgId), {
      type: 'pool.accepted',
      bookingId: params.bookingId,
      sitterName: params.sitterName,
      clientName: params.clientName,
      service: params.service,
      ts: Date.now(),
    }).catch(() => {});

    await logEvent({
      orgId: params.orgId,
      action: 'notification.owner.pool_accepted',
      bookingId: params.bookingId,
      status: 'success',
      metadata: { sitterName: params.sitterName },
    });
  } catch (error) {
    console.error('[notification] ownerPoolAccepted failed:', error);
  }
}
