/**
 * Completed Bookings Component
 * 
 * Collapsed by default. Shows earnings breakdown and history
 */

'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { type SitterBooking } from '@/lib/api/sitter-dashboard-hooks';
import { format } from 'date-fns';

interface CompletedBookingsProps {
  bookings: SitterBooking[];
  totalEarnings: number | null;
}

export function CompletedBookings({ bookings, totalEarnings }: CompletedBookingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort by completion date (most recent first)
  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(b.endAt).getTime() - new Date(a.endAt).getTime()
  );

  return (
    <Card style={{ padding: tokens.spacing[4] }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: isExpanded ? tokens.spacing[4] : 0,
      }}>
        <div>
          <h2 style={{ 
            fontSize: tokens.typography.fontSize.xl[0], 
            fontWeight: tokens.typography.fontWeight.bold,
            marginBottom: tokens.spacing[1],
          }}>
            Completed Bookings
          </h2>
          <div style={{ 
            fontSize: tokens.typography.fontSize.sm[0],
            color: tokens.colors.text.secondary,
          }}>
            {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'} completed
            {totalEarnings !== null && (
              <span style={{ marginLeft: tokens.spacing[2] }}>
                • Total earnings: <strong>${totalEarnings.toFixed(2)}</strong>
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
          {sortedBookings.length === 0 ? (
            <div style={{ 
              padding: tokens.spacing[4],
              textAlign: 'center',
              color: tokens.colors.text.secondary,
            }}>
              No completed bookings yet
            </div>
          ) : (
            sortedBookings.map((booking) => {
              const clientName = booking.client 
                ? `${booking.client.firstName} ${booking.client.lastName}`
                : `${booking.firstName} ${booking.lastName}`;

              const payout = booking.totalPrice * 0.8; // Placeholder - should come from sitter commission

              return (
                <Card
                  key={booking.id}
                  style={{
                    padding: tokens.spacing[3],
                    border: `1px solid ${tokens.colors.border.default}`,
                    backgroundColor: tokens.colors.neutral[50],
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ 
                        fontWeight: tokens.typography.fontWeight.medium,
                        marginBottom: tokens.spacing[1],
                      }}>
                        {clientName} • {booking.service}
                      </div>
                      <div style={{ 
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                      }}>
                        {format(new Date(booking.endAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: tokens.typography.fontSize.lg[0],
                      fontWeight: tokens.typography.fontWeight.semibold,
                      color: tokens.colors.success.DEFAULT,
                    }}>
                      ${payout.toFixed(2)}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
}
