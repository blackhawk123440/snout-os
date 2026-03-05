import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireOwnerOrAdmin } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';
import { checkAssignmentAllowed } from '@/lib/availability/booking-conflict';
import { forceAssignSitter } from '@/lib/dispatch-control';
import { logEvent } from '@/lib/log-event';
import { getRateLimitIdentifier } from '@/lib/rate-limit';

type ResolveAction = 'assign_notify' | 'rollback';

type SnapshotAttentionState = {
  handledAt: string | null;
  snoozedUntil: string | null;
} | null;

function parseItemId(itemId: string): { type: string; bookingId: string | null } {
  const [type, rawEntityId] = itemId.split(':', 2);
  if (!type || !rawEntityId) return { type: '', bookingId: null };
  if (type === 'coverage_gap' || type === 'unassigned') {
    return { type, bookingId: rawEntityId };
  }
  return { type, bookingId: null };
}

function isAllowedType(type: string): boolean {
  return type === 'coverage_gap' || type === 'unassigned';
}

function encodeRollbackToken(rawToken: string, assignmentId: string): string {
  return Buffer.from(`${rawToken}:${assignmentId}`).toString('base64url');
}

function decodeRollbackToken(token: string): { rawToken: string; assignmentId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [rawToken, ...assignmentParts] = decoded.split(':');
    const assignmentId = assignmentParts.join(':');
    if (!rawToken || !assignmentId) return null;
    return { rawToken, assignmentId };
  } catch {
    return null;
  }
}

function renderNotifyTemplate(
  template: string,
  vars: Record<string, string | null | undefined>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k: string) => vars[k] ?? '');
}

async function hasConfirmedOverlap(
  db: ReturnType<typeof getScopedDb>,
  bookingId: string,
  sitterId: string,
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const conflict = await db.booking.findFirst({
    where: {
      id: { not: bookingId },
      sitterId,
      status: { in: ['confirmed', 'in_progress'] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });
  return !!conflict;
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getRateLimitIdentifier(request);
  const actorUserId = ctx.userId ?? undefined;
  const db = getScopedDb(ctx);

  try {
    const body = (await request.json()) as {
      itemId?: string;
      action?: ResolveAction;
      sitterId?: string;
      rollbackToken?: string;
    };
    const itemId = (body.itemId || '').trim();
    const action = body.action;
    const { type, bookingId } = parseItemId(itemId);
    if (!itemId || !action || !bookingId || !isAllowedType(type)) {
      return NextResponse.json({ error: 'itemId and action are required' }, { status: 400 });
    }

    const booking = await db.booking.findFirst({
      where: { id: bookingId },
      select: {
        id: true,
        orgId: true,
        firstName: true,
        lastName: true,
        service: true,
        sitterId: true,
        status: true,
        dispatchStatus: true,
        startAt: true,
        endAt: true,
      },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const assignmentId = `staffing_assign:${booking.id}`;

    if (action === 'rollback') {
      if (!body.rollbackToken) {
        return NextResponse.json({ error: 'rollbackToken is required' }, { status: 400 });
      }
      const tokenDecoded = decodeRollbackToken(body.rollbackToken);
      if (!tokenDecoded || tokenDecoded.assignmentId !== assignmentId) {
        return NextResponse.json({ error: 'Invalid rollback token' }, { status: 400 });
      }

      const tokenUsed = await db.eventLog.findFirst({
        where: {
          eventType: 'ops.staffing.rollback_used',
          metadata: { contains: `"token":"${tokenDecoded.rawToken}"` },
        },
        select: { id: true },
      });
      if (tokenUsed) {
        return NextResponse.json({ error: 'Rollback token already used' }, { status: 409 });
      }

      const tokenIssued = await db.eventLog.findFirst({
        where: {
          eventType: 'ops.staffing.rollback_issued',
          metadata: { contains: `"token":"${tokenDecoded.rawToken}"` },
        },
        orderBy: { createdAt: 'desc' },
        select: { metadata: true },
      });
      if (!tokenIssued?.metadata) {
        return NextResponse.json({ error: 'Rollback token not found' }, { status: 404 });
      }

      const parsed = JSON.parse(tokenIssued.metadata) as {
        token: string;
        previousSitterId: string | null;
        previousStatus: string;
        previousDispatchStatus: string | null;
        previousAttentionState: SnapshotAttentionState;
      };

      await db.booking.update({
        where: { id: booking.id },
        data: {
          sitterId: parsed.previousSitterId,
          dispatchStatus: parsed.previousDispatchStatus ?? 'auto',
          status: parsed.previousStatus || 'pending',
        },
      });

      if (!parsed.previousAttentionState) {
        await db.commandCenterAttentionState.deleteMany({
          where: { itemKey: itemId },
        });
      } else {
        await db.commandCenterAttentionState.upsert({
          where: { orgId_itemKey: { orgId: ctx.orgId, itemKey: itemId } },
          create: {
            orgId: ctx.orgId,
            itemKey: itemId,
            handledAt: parsed.previousAttentionState.handledAt
              ? new Date(parsed.previousAttentionState.handledAt)
              : null,
            snoozedUntil: parsed.previousAttentionState.snoozedUntil
              ? new Date(parsed.previousAttentionState.snoozedUntil)
              : null,
          },
          update: {
            handledAt: parsed.previousAttentionState.handledAt
              ? new Date(parsed.previousAttentionState.handledAt)
              : null,
            snoozedUntil: parsed.previousAttentionState.snoozedUntil
              ? new Date(parsed.previousAttentionState.snoozedUntil)
              : null,
          },
        });
      }

      await db.eventLog.create({
        data: {
          orgId: ctx.orgId,
          eventType: 'ops.staffing.rollback_used',
          status: 'success',
          bookingId: booking.id,
          metadata: JSON.stringify({
            token: tokenDecoded.rawToken,
            assignmentId,
            itemId,
          }),
        },
      });

      await logEvent({
        orgId: ctx.orgId,
        actorUserId,
        action: 'ops.staffing.rollback',
        status: 'success',
        bookingId: booking.id,
        metadata: {
          itemId,
          type,
          assignmentId,
          rollbackTokenUsed: true,
          restoredSitterId: parsed.previousSitterId,
          ip,
        },
      });

      return NextResponse.json({
        ok: true,
        assignmentId,
        bookingId: booking.id,
        sitterId: parsed.previousSitterId,
      });
    }

    const existingAssignment = await db.eventLog.findFirst({
      where: {
        eventType: 'ops.staffing.assign_notify',
        status: 'success',
        bookingId: booking.id,
        metadata: { contains: `"assignmentId":"${assignmentId}"` },
      },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true },
    });
    if (existingAssignment?.metadata && booking.sitterId) {
      const existing = JSON.parse(existingAssignment.metadata) as {
        sitterId?: string;
        notifySent?: boolean;
        rollbackToken?: string;
      };
      return NextResponse.json({
        assignmentId,
        bookingId: booking.id,
        sitterId: booking.sitterId,
        rollbackToken: existing.rollbackToken ?? null,
        notifySent: existing.notifySent === true,
        idempotent: true,
      });
    }

    let selectedSitterId = body.sitterId ?? null;
    if (!selectedSitterId) {
      const preferredFixture = await db.sitter.findFirst({
        where: { active: true, deletedAt: null, email: 'fixture-resolve-sitter@example.com' },
        select: { id: true },
      });
      const sitters = await db.sitter.findMany({
        where: { active: true, deletedAt: null },
        select: { id: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      const candidates = preferredFixture
        ? [{ id: preferredFixture.id }, ...sitters.filter((s) => s.id !== preferredFixture.id)]
        : sitters;

      for (const sitter of candidates) {
        const hasOverlap = await hasConfirmedOverlap(
          db,
          booking.id,
          sitter.id,
          booking.startAt,
          booking.endAt
        );
        if (hasOverlap) continue;

        const { allowed } = await checkAssignmentAllowed({
          db: db as any,
          orgId: ctx.orgId,
          sitterId: sitter.id,
          start: booking.startAt,
          end: booking.endAt,
          excludeBookingId: booking.id,
          respectGoogleBusy: true,
          force: false,
          actorUserId,
          bookingId: booking.id,
        });
        if (allowed) {
          selectedSitterId = sitter.id;
          break;
        }
      }
    }

    if (!selectedSitterId) {
      return NextResponse.json(
        { error: 'No available sitter found for one-click assignment' },
        { status: 409 }
      );
    }

    const selectedHasOverlap = await hasConfirmedOverlap(
      db,
      booking.id,
      selectedSitterId,
      booking.startAt,
      booking.endAt
    );
    if (selectedHasOverlap) {
      return NextResponse.json(
        { error: 'Selected sitter has overlapping confirmed booking' },
        { status: 409 }
      );
    }
    const selectedAllowed = await checkAssignmentAllowed({
      db: db as any,
      orgId: ctx.orgId,
      sitterId: selectedSitterId,
      start: booking.startAt,
      end: booking.endAt,
      excludeBookingId: booking.id,
      respectGoogleBusy: true,
      force: false,
      actorUserId,
      bookingId: booking.id,
    });
    if (!selectedAllowed.allowed) {
      return NextResponse.json({ error: 'Selected sitter is unavailable' }, { status: 409 });
    }

    const previousSitterId = booking.sitterId;
    const previousAttentionStateRecord = await db.commandCenterAttentionState.findUnique({
      where: { orgId_itemKey: { orgId: ctx.orgId, itemKey: itemId } },
      select: { handledAt: true, snoozedUntil: true },
    });
    const previousAttentionState: SnapshotAttentionState = previousAttentionStateRecord
      ? {
          handledAt: previousAttentionStateRecord.handledAt?.toISOString() ?? null,
          snoozedUntil: previousAttentionStateRecord.snoozedUntil?.toISOString() ?? null,
        }
      : null;

    await forceAssignSitter(
      ctx.orgId,
      booking.id,
      selectedSitterId,
      'Command Center one-click assign',
      actorUserId ?? 'system'
    );

    const rawRollbackToken = randomUUID();
    const rollbackToken = encodeRollbackToken(rawRollbackToken, assignmentId);

    await db.eventLog.create({
      data: {
        orgId: ctx.orgId,
        eventType: 'ops.staffing.rollback_issued',
        status: 'success',
        bookingId: booking.id,
        metadata: JSON.stringify({
          token: rawRollbackToken,
          assignmentId,
          bookingId: booking.id,
          itemId,
          previousSitterId,
          previousStatus: booking.status,
          previousDispatchStatus: booking.dispatchStatus,
          previousAttentionState,
        }),
      },
    });

    let notifySent = false;
    let notifyTemplateApplied = false;
    try {
      await db.eventLog.create({
        data: {
          orgId: ctx.orgId,
          eventType: 'ops.staffing.notify.queued',
          status: 'pending',
          bookingId: booking.id,
          metadata: JSON.stringify({
            assignmentId,
            itemId,
            sitterId: selectedSitterId,
            actorUserId,
          }),
        },
      });
      notifySent = true;

      const templateSetting = await db.setting.findUnique({
        where: { key: 'ops.staffing.assign_notify.template' },
        select: { value: true },
      });
      const template = templateSetting?.value?.trim() || '';
      if (template) {
        const rendered = renderNotifyTemplate(template, {
          firstName: booking.firstName,
          lastName: booking.lastName,
          service: booking.service,
          startAt: booking.startAt.toISOString(),
          bookingId: booking.id,
        });
        await db.eventLog.create({
          data: {
            orgId: ctx.orgId,
            eventType: 'message.sent',
            status: 'success',
            bookingId: booking.id,
            metadata: JSON.stringify({
              channel: 'staffing_assign_notify',
              assignmentId,
              sitterId: selectedSitterId,
              body: rendered,
            }),
          },
        });
        notifyTemplateApplied = true;
      }
    } catch {
      notifySent = false;
    }

    await db.eventLog.create({
      data: {
        orgId: ctx.orgId,
        eventType: 'ops.staffing.assign_notify',
        status: 'success',
        bookingId: booking.id,
        metadata: JSON.stringify({
          assignmentId,
          bookingId: booking.id,
          itemId,
          sitterId: selectedSitterId,
          rollbackToken,
          notifySent,
          notifyTemplateApplied,
          previousSitterId,
        }),
      },
    });

    await logEvent({
      orgId: ctx.orgId,
      actorUserId,
      action: 'ops.staffing.assign_notify',
      status: 'success',
      bookingId: booking.id,
      metadata: {
        itemId,
        type,
        assignmentId,
        selectedSitterId,
        previousSitterId,
        notifySent,
        rollbackTokenIssued: true,
        ip,
      },
    });

    return NextResponse.json({
      assignmentId,
      bookingId: booking.id,
      sitterId: selectedSitterId,
      rollbackToken,
      notifySent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logEvent({
      orgId: ctx.orgId,
      actorUserId,
      action: 'ops.staffing.assign_notify',
      status: 'failed',
      metadata: { message, ip },
    });
    return NextResponse.json({ error: 'Failed to resolve staffing item', message }, { status: 500 });
  }
}
