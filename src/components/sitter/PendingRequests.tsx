/**
 * Pending Requests Component
 * 
 * Shows booking requests that require sitter action (accept/decline)
 * Highest priority section - appears at top if any exist
 */

'use client';

import { useState } from 'react';
import { Card, Button, Badge, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAcceptBooking, useDeclineBooking, type SitterBooking } from '@/lib/api/sitter-dashboard-hooks';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface PendingRequestsProps {
  bookings: SitterBooking[];
  sitterId: string;
}

export function PendingRequests({ bookings, sitterId }: PendingRequestsProps) {
  const acceptBooking = useAcceptBooking();
  const declineBooking = useDeclineBooking();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      await acceptBooking.mutateAsync({ bookingId, sitterId });
    } catch (error) {
      console.error('Failed to accept booking:', error);
      alert('Failed to accept booking. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    if (!confirm('Are you sure you want to decline this booking request?')) {
      return;
    }
    setProcessingId(bookingId);
    try {
      await declineBooking.mutateAsync({ bookingId, sitterId });
    } catch (error) {
      console.error('Failed to decline booking:', error);
      alert('Failed to decline booking. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (bookings.length === 0) {
    return null;
  }

  return (
    <Card style={{ padding: tokens.spacing[4] }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: tokens.spacing[4] 
      }}>
        <h2 style={{ 
          fontSize: tokens.typography.fontSize.xl[0], 
          fontWeight: tokens.typography.fontWeight.bold 
        }}>
          Pending Requests
        </h2>
        <Badge variant="warning" style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          {bookings.length} {bookings.length === 1 ? 'request' : 'requests'}
        </Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
        {bookings.map((booking) => {
          const offer = booking.sitterPoolOffer;
          const expiresAt = offer?.expiresAt ? new Date(offer.expiresAt) : null;
          const now = new Date();
          const timeRemaining = expiresAt ? expiresAt.getTime() - now.getTime() : null;
          const isExpired = timeRemaining !== null && timeRemaining <= 0;
          const isProcessing = processingId === booking.id;

          const clientName = booking.client 
            ? `${booking.client.firstName} ${booking.client.lastName}`
            : `${booking.firstName} ${booking.lastName}`;

          const petNames = booking.pets.map(p => p.name).join(', ') || 'No pets listed';

          // Calculate payout (assuming commission percentage - will need to fetch from sitter)
          const payout = booking.totalPrice * 0.8; // Placeholder - should come from sitter commission

          return (
            <Card
              key={booking.id}
              style={{
                padding: tokens.spacing[4],
                border: `2px solid ${isExpired ? tokens.colors.error[300] : tokens.colors.warning[300]}`,
                backgroundColor: isExpired ? tokens.colors.error[50] : tokens.colors.background.default,
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
                  {isExpired && (
                    <Badge variant="error">Expired</Badge>
                  )}
                </div>

                {/* Details */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: tokens.spacing[2],
                  fontSize: tokens.typography.fontSize.sm[0],
                }}>
                  <div>
                    <strong>Date & Time:</strong><br />
                    {format(new Date(booking.startAt), 'MMM d, yyyy')}<br />
                    {format(new Date(booking.startAt), 'h:mm a')} - {format(new Date(booking.endAt), 'h:mm a')}
                  </div>
                  <div>
                    <strong>Location:</strong><br />
                    {booking.address || 'Not specified'}
                  </div>
                  <div>
                    <strong>Service:</strong><br />
                    {booking.service}
                  </div>
                  <div>
                    <strong>Payout:</strong><br />
                    <span style={{ 
                      fontSize: tokens.typography.fontSize.lg[0],
                      fontWeight: tokens.typography.fontWeight.semibold,
                      color: tokens.colors.success.DEFAULT,
                    }}>
                      ${payout.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Countdown Timer */}
                {expiresAt && !isExpired && (
                  <div style={{
                    padding: tokens.spacing[2],
                    backgroundColor: tokens.colors.warning[50],
                    borderRadius: tokens.borderRadius.md,
                    fontSize: tokens.typography.fontSize.sm[0],
                    fontWeight: tokens.typography.fontWeight.medium,
                    color: tokens.colors.warning[700],
                  }}>
                    ⏰ Response deadline: {formatDistanceToNow(expiresAt, { addSuffix: true })}
                  </div>
                )}

                {isExpired && (
                  <div style={{
                    padding: tokens.spacing[2],
                    backgroundColor: tokens.colors.error[50],
                    borderRadius: tokens.borderRadius.md,
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.error[700],
                  }}>
                    This request has expired and will be re-assigned.
                  </div>
                )}

                {/* Actions */}
                <div style={{ 
                  display: 'flex', 
                  gap: tokens.spacing[2],
                  flexWrap: 'wrap',
                }}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleAccept(booking.id)}
                    disabled={isProcessing || isExpired}
                    style={{ flex: '1 1 auto', minWidth: '120px' }}
                  >
                    {isProcessing && processingId === booking.id ? 'Processing...' : 'Accept Booking'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleDecline(booking.id)}
                    disabled={isProcessing || isExpired}
                    style={{ flex: '1 1 auto', minWidth: '120px' }}
                  >
                    Decline
                  </Button>
                  {booking.threadId && (
                    <Link href={`/sitter/inbox?thread=${booking.threadId}`}>
                      <Button
                        variant="outline"
                        size="md"
                        style={{ flex: '1 1 auto', minWidth: '120px' }}
                      >
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
    </Card>
  );
}
