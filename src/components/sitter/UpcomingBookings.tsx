/**
 * Upcoming Bookings Component
 * 
 * Chronological list of confirmed upcoming bookings
 */

'use client';

import { Card, Button, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { type SitterBooking } from '@/lib/api/sitter-dashboard-hooks';
import { format } from 'date-fns';
import Link from 'next/link';

interface UpcomingBookingsProps {
  bookings: SitterBooking[];
}

export function UpcomingBookings({ bookings }: UpcomingBookingsProps) {
  // Sort by start date
  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  return (
    <Card style={{ padding: tokens.spacing[4] }}>
      <h2 style={{ 
        fontSize: tokens.typography.fontSize.xl[0], 
        fontWeight: tokens.typography.fontWeight.bold,
        marginBottom: tokens.spacing[4],
      }}>
        Upcoming Bookings
      </h2>

      {sortedBookings.length === 0 ? (
        <EmptyState
          title="No upcoming bookings"
          description="You don't have any confirmed bookings coming up. Accepted requests will appear here."
          icon="📅"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
          {sortedBookings.map((booking) => {
            const clientName = booking.client 
              ? `${booking.client.firstName} ${booking.client.lastName}`
              : `${booking.firstName} ${booking.lastName}`;

            const petNames = booking.pets.map(p => p.name).join(', ') || 'No pets listed';

            return (
              <Card
                key={booking.id}
                style={{
                  padding: tokens.spacing[4],
                  border: `1px solid ${tokens.colors.border.default}`,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ 
                        fontSize: tokens.typography.fontSize.lg[0], 
                        fontWeight: tokens.typography.fontWeight.semibold,
                        marginBottom: tokens.spacing[1],
                      }}>
                        {clientName}
                      </h3>
                      <div style={{ 
                        fontSize: tokens.typography.fontSize.sm[0], 
                        color: tokens.colors.text.secondary,
                      }}>
                        {petNames}
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: tokens.spacing[2],
                    fontSize: tokens.typography.fontSize.sm[0],
                  }}>
                    <div>
                      <strong>Date:</strong><br />
                      {format(new Date(booking.startAt), 'EEEE, MMM d, yyyy')}
                    </div>
                    <div>
                      <strong>Time:</strong><br />
                      {format(new Date(booking.startAt), 'h:mm a')} - {format(new Date(booking.endAt), 'h:mm a')}
                    </div>
                    <div>
                      <strong>Service:</strong><br />
                      {booking.service}
                    </div>
                    <div>
                      <strong>Address:</strong><br />
                      {booking.address || 'Not specified'}
                    </div>
                  </div>

                  {/* Notes */}
                  {booking.notes && (
                    <div style={{
                      padding: tokens.spacing[2],
                      backgroundColor: tokens.colors.neutral[50],
                      borderRadius: tokens.borderRadius.md,
                      fontSize: tokens.typography.fontSize.sm[0],
                    }}>
                      <strong>Notes:</strong> {booking.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ 
                    display: 'flex', 
                    gap: tokens.spacing[2],
                    flexWrap: 'wrap',
                  }}>
                    <Link href={`/bookings/${booking.id}`}>
                      <Button variant="secondary" size="md">
                        View Details
                      </Button>
                    </Link>
                    {booking.threadId && (
                      <Link href={`/sitter/inbox?thread=${booking.threadId}`}>
                        <Button variant="secondary" size="md">
                          Message
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
