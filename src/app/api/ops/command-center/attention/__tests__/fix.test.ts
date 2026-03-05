import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockDb = {
  eventLog: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  commandCenterAttentionState: {
    upsert: vi.fn(),
  },
};

vi.mock('@/lib/request-context', () => ({
  getRequestContext: vi.fn(),
}));
vi.mock('@/lib/rbac', () => ({
  ForbiddenError: class ForbiddenError extends Error {},
  requireOwnerOrAdmin: vi.fn(),
}));
vi.mock('@/lib/tenancy', () => ({
  getScopedDb: vi.fn(() => mockDb),
}));
vi.mock('@/lib/automation-queue', () => ({
  enqueueAutomation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/calendar-queue', () => ({
  enqueueCalendarSync: vi.fn().mockResolvedValue('job-1'),
}));

import { POST } from '@/app/api/ops/command-center/attention/fix/route';
import { getRequestContext } from '@/lib/request-context';

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/ops/command-center/attention/fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ops/command-center/attention/fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getRequestContext as any).mockResolvedValue({
      orgId: 'org-1',
      role: 'owner',
      userId: 'owner-1',
    });
  });

  it('queues automation fix and marks item handled', async () => {
    mockDb.eventLog.findFirst.mockResolvedValue({
      id: 'evt-failed-1',
      eventType: 'automation.failed',
      automationType: 'bookingConfirmation',
      error: 'failed',
      bookingId: 'booking-1',
      metadata: JSON.stringify({
        automationType: 'bookingConfirmation',
        recipient: 'owner',
        context: { bookingId: 'booking-1' },
        jobId: 'retry-1',
      }),
    });
    mockDb.eventLog.create.mockResolvedValue({
      id: 'evt-action-1',
      eventType: 'command_center.fix.automation.enqueued',
    });
    mockDb.commandCenterAttentionState.upsert.mockResolvedValue({ id: 'state-1' });

    const res = await POST(makeReq({ itemId: 'automation_failure:evt-failed-1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.queued).toBe(true);
    expect(body.actionEventLogId).toBe('evt-action-1');
    expect(body.actionEventType).toBe('command_center.fix.automation.enqueued');
    expect(mockDb.commandCenterAttentionState.upsert).toHaveBeenCalledTimes(1);
  });

  it('queues calendar repair fix and marks item handled', async () => {
    mockDb.eventLog.findFirst.mockResolvedValue({
      id: 'evt-cal-1',
      eventType: 'calendar.sync.failed',
      automationType: 'calendarSync',
      error: 'calendar failed',
      bookingId: 'booking-2',
      metadata: JSON.stringify({ sitterId: 'sitter-1' }),
    });
    mockDb.eventLog.create.mockResolvedValue({
      id: 'evt-action-2',
      eventType: 'command_center.fix.calendar.enqueued',
    });
    mockDb.commandCenterAttentionState.upsert.mockResolvedValue({ id: 'state-2' });

    const res = await POST(makeReq({ itemId: 'calendar_repair:evt-cal-1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.queued).toBe(true);
    expect(body.actionEventLogId).toBe('evt-action-2');
    expect(body.actionEventType).toBe('command_center.fix.calendar.enqueued');
    expect(mockDb.commandCenterAttentionState.upsert).toHaveBeenCalledTimes(1);
  });
});

