import { describe, expect, it } from 'vitest';
import { detectSitterOverlaps } from '@/app/api/ops/command-center/attention/helpers';

describe('detectSitterOverlaps', () => {
  it('detects overlapping bookings for same sitter', () => {
    const overlaps = detectSitterOverlaps([
      {
        id: 'b1',
        sitterId: 's1',
        startAt: '2026-03-04T10:00:00.000Z',
        endAt: '2026-03-04T11:00:00.000Z',
      },
      {
        id: 'b2',
        sitterId: 's1',
        startAt: '2026-03-04T10:30:00.000Z',
        endAt: '2026-03-04T11:30:00.000Z',
      },
      {
        id: 'b3',
        sitterId: 's2',
        startAt: '2026-03-04T10:30:00.000Z',
        endAt: '2026-03-04T11:30:00.000Z',
      },
    ]);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]).toMatchObject({
      sitterId: 's1',
      bookingAId: 'b1',
      bookingBId: 'b2',
    });
  });

  it('returns empty array when no overlap exists', () => {
    const overlaps = detectSitterOverlaps([
      {
        id: 'b1',
        sitterId: 's1',
        startAt: '2026-03-04T10:00:00.000Z',
        endAt: '2026-03-04T11:00:00.000Z',
      },
      {
        id: 'b2',
        sitterId: 's1',
        startAt: '2026-03-04T11:00:00.000Z',
        endAt: '2026-03-04T12:00:00.000Z',
      },
    ]);
    expect(overlaps).toEqual([]);
  });
});
