import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireOwnerOrAdmin } from '@/lib/rbac';
import { getRuntimeEnvName } from '@/lib/runtime-env';

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

async function ensureRoleTestAccounts(orgId: string) {
  const assigned = await prisma.booking.findFirst({
    where: { orgId, sitterId: { not: null } },
    select: { sitterId: true },
    orderBy: { createdAt: 'desc' },
  });

  return { sitterId: assigned?.sitterId ?? null };
}

export async function POST(request: NextRequest) {
  const envName = getRuntimeEnvName();
  if (envName === 'prod') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const providedKey = request.headers.get('x-e2e-key');
  const expectedKey = process.env.E2E_AUTH_KEY;
  if (providedKey && expectedKey && providedKey !== expectedKey) {
    return NextResponse.json({ error: 'Invalid x-e2e-key' }, { status: 401 });
  }
  const hasValidE2eBypass = !!providedKey && !!expectedKey && providedKey === expectedKey;

  let orgId = process.env.PERSONAL_ORG_ID || 'default';
  if (!hasValidE2eBypass) {
    let ctx;
    try {
      ctx = await getRequestContext();
      requireOwnerOrAdmin(ctx);
      orgId = ctx.orgId;
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { sitterId } = await ensureRoleTestAccounts(orgId);
    const now = new Date();

    const overlapA = sitterId
      ? await prisma.booking.create({
      data: {
        orgId,
        firstName: 'Fixture',
        lastName: 'Overlap A',
        phone: '+15551000001',
        email: 'fixture-overlap-a@example.com',
        service: 'Dog Walking',
        startAt: addMinutes(now, 240),
        endAt: addMinutes(now, 300),
        totalPrice: 25,
        status: 'confirmed',
        sitterId,
      },
      select: { id: true, startAt: true },
    })
      : null;

    const overlapB = sitterId
      ? await prisma.booking.create({
      data: {
        orgId,
        firstName: 'Fixture',
        lastName: 'Overlap B',
        phone: '+15551000002',
        email: 'fixture-overlap-b@example.com',
        service: 'Drop-ins',
        startAt: addMinutes(now, 270),
        endAt: addMinutes(now, 330),
        totalPrice: 30,
        status: 'confirmed',
        sitterId,
      },
      select: { id: true },
    })
      : null;

    const unassignedA = await prisma.booking.create({
      data: {
        orgId,
        firstName: 'Fixture',
        lastName: 'Unassigned A',
        phone: '+15551000003',
        email: 'fixture-unassigned-a@example.com',
        service: 'Dog Walking',
        startAt: addMinutes(now, 180),
        endAt: addMinutes(now, 210),
        totalPrice: 20,
        status: 'confirmed',
      },
      select: { id: true },
    });

    const unassignedB = await prisma.booking.create({
      data: {
        orgId,
        firstName: 'Fixture',
        lastName: 'Unassigned B',
        phone: '+15551000004',
        email: 'fixture-unassigned-b@example.com',
        service: 'Drop-ins',
        startAt: addMinutes(now, 360),
        endAt: addMinutes(now, 390),
        totalPrice: 22,
        status: 'pending',
      },
      select: { id: true },
    });

    const dedupeBooking = await prisma.booking.create({
      data: {
        orgId,
        firstName: 'Fixture',
        lastName: 'Dedupe Target',
        phone: '+15551000005',
        email: 'fixture-dedupe@example.com',
        service: 'Dog Walking',
        startAt: addMinutes(now, 90),
        endAt: addMinutes(now, 120),
        totalPrice: 19,
        status: 'confirmed',
        sitterId: sitterId ?? null,
      },
      select: { id: true },
    });

    const threadAId = randomUUID();
    const threadBId = randomUUID();

    const automationFailedA = await prisma.eventLog.create({
      data: {
        orgId,
        eventType: 'automation.failed',
        automationType: 'bookingConfirmation',
        status: 'failed',
        error: 'Fixture: booking confirmation failed',
        bookingId: dedupeBooking.id,
      },
      select: { id: true },
    });
    const automationDead = await prisma.eventLog.create({
      data: {
        orgId,
        eventType: 'automation.dead',
        automationType: 'bookingConfirmation',
        status: 'failed',
        error: 'Fixture: automation dead-letter event',
        bookingId: dedupeBooking.id,
      },
      select: { id: true },
    });
    const automationFailedB = await prisma.eventLog.create({
      data: {
        orgId,
        eventType: 'automation.failed',
        automationType: 'bookingConfirmation',
        status: 'failed',
        error: 'Fixture: retry automation failed',
        bookingId: dedupeBooking.id,
      },
      select: { id: true },
    });

    const messageFailedA = await prisma.eventLog.create({
      data: {
        orgId,
        eventType: 'message.failed',
        status: 'failed',
        error: 'Fixture: outbound message failed for thread A',
        metadata: JSON.stringify({ threadId: threadAId }),
      },
      select: { id: true },
    });
    const messageFailedB = await prisma.eventLog.create({
      data: {
        orgId,
        eventType: 'message.failed',
        status: 'failed',
        error: 'Fixture: outbound message failed for thread B',
        metadata: JSON.stringify({ threadId: threadBId }),
      },
      select: { id: true },
    });

    const calendarFailed = await prisma.eventLog.create({
      data: {
        orgId,
        eventType: 'calendar.sync.failed',
        automationType: 'calendarSync',
        status: 'failed',
        error: 'Fixture: calendar sync failed for sitter',
        bookingId: overlapA?.id ?? dedupeBooking.id,
        metadata: JSON.stringify({ sitterId: sitterId ?? 'unknown' }),
      },
      select: { id: true },
    });

    const expectedItemKeys = [
      `automation_failure:${dedupeBooking.id}`,
      `automation_failure:${messageFailedA.id}`,
      `automation_failure:${messageFailedB.id}`,
      `calendar_repair:${overlapA?.id ?? dedupeBooking.id}`,
      `coverage_gap:${unassignedA.id}`,
      `coverage_gap:${unassignedB.id}`,
      `unassigned:${unassignedA.id}`,
      `unassigned:${unassignedB.id}`,
      ...(overlapA && overlapB ? [`overlap:${overlapA.id}_${overlapB.id}`] : []),
    ];

    return NextResponse.json({
      ok: true,
      envName,
      created: {
        eventLogIds: [
          automationFailedA.id,
          automationDead.id,
          automationFailedB.id,
          messageFailedA.id,
          messageFailedB.id,
          calendarFailed.id,
        ],
        bookingIds: [
          dedupeBooking.id,
          unassignedA.id,
          unassignedB.id,
          ...(overlapA ? [overlapA.id] : []),
          ...(overlapB ? [overlapB.id] : []),
        ],
        threadIds: [threadAId, threadBId],
      },
      expectedItemKeys,
      testAccounts: {
        owner: { email: 'owner@example.com', password: 'e2e-test-password' },
        sitter: { email: 'sitter@example.com', password: 'e2e-test-password' },
        client: { email: 'client@example.com', password: 'e2e-test-password' },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to seed fixtures', message }, { status: 500 });
  }
}
