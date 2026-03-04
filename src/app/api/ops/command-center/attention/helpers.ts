export interface StaffingBookingLike {
  id: string;
  sitterId: string | null;
  startAt: string | Date;
  endAt: string | Date;
}

export interface OverlapPair {
  sitterId: string;
  bookingAId: string;
  bookingBId: string;
  overlapStart: string;
}

export function detectSitterOverlaps(bookings: StaffingBookingLike[]): OverlapPair[] {
  const bySitter = new Map<string, StaffingBookingLike[]>();
  for (const booking of bookings) {
    if (!booking.sitterId) continue;
    const list = bySitter.get(booking.sitterId) ?? [];
    list.push(booking);
    bySitter.set(booking.sitterId, list);
  }

  const overlaps: OverlapPair[] = [];
  for (const [sitterId, sitterBookings] of bySitter.entries()) {
    const sorted = [...sitterBookings].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (new Date(current.endAt).getTime() > new Date(next.startAt).getTime()) {
        overlaps.push({
          sitterId,
          bookingAId: current.id,
          bookingBId: next.id,
          overlapStart: new Date(next.startAt).toISOString(),
        });
      }
    }
  }

  return overlaps;
}
