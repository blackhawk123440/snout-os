/**
 * Sitter Calendar Tab
 * 
 * Displays Google Calendar sync status and upcoming bookings.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, EmptyState, Skeleton, SectionHeader } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { BookingScheduleDisplay } from '@/components/booking';
import { useMobile } from '@/lib/use-mobile';

interface CalendarStatus {
  connected: boolean;
  syncEnabled: boolean;
  calendarId: string | null;
  lastSyncAt: string | null;
}

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: string;
  address?: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface SitterCalendarTabProps {
  sitterId: string;
}

export function SitterCalendarTab({ sitterId }: SitterCalendarTabProps) {
  const isMobile = useMobile();
  const [loading, setLoading] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [toggling, setToggling] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, [sitterId]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sitters/${sitterId}/calendar`);
      if (response.ok) {
        const data = await response.json();
        setCalendarStatus(data.status);
        setUpcomingBookings(data.upcomingBookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSync = async () => {
    if (!calendarStatus?.connected) {
      return;
    }

    setToggling(true);
    try {
      const response = await fetch(`/api/sitters/${sitterId}/calendar/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !calendarStatus.syncEnabled }),
      });

      if (response.ok) {
        await fetchCalendarData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to toggle sync');
      }
    } catch (error) {
      console.error('Failed to toggle sync:', error);
      alert('Failed to toggle sync');
    } finally {
      setToggling(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Redirect to Google OAuth flow
      window.location.href = `/api/integrations/google/start?sitterId=${sitterId}`;
    } catch (error) {
      console.error('Failed to start OAuth:', error);
      alert('Failed to connect Google Calendar');
      setConnecting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        <Skeleton height={200} />
        <Skeleton height={400} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      {/* Sync Status Card */}
      <Card>
        <SectionHeader title="Google Calendar Sync" />
        <div style={{ padding: tokens.spacing[4] }}>
          {calendarStatus?.connected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
                <Badge variant="success">Connected</Badge>
                <Badge variant={calendarStatus.syncEnabled ? 'success' : 'default'}>
                  {calendarStatus.syncEnabled ? 'Sync Enabled' : 'Sync Disabled'}
                </Badge>
              </div>

              {calendarStatus.calendarId && (
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                  Calendar: {calendarStatus.calendarId}
                </div>
              )}

              {calendarStatus.lastSyncAt && (
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                  Last synced: {formatDate(calendarStatus.lastSyncAt)} at {formatTime(calendarStatus.lastSyncAt)}
                </div>
              )}

              <div style={{ display: 'flex', gap: tokens.spacing[3] }}>
                <Button
                  variant={calendarStatus.syncEnabled ? 'secondary' : 'primary'}
                  onClick={handleToggleSync}
                  disabled={toggling}
                  leftIcon={<i className={`fas fa-${calendarStatus.syncEnabled ? 'pause' : 'play'}`} />}
                >
                  {toggling ? 'Updating...' : calendarStatus.syncEnabled ? 'Disable Sync' : 'Enable Sync'}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
                <Badge variant="error">Not Connected</Badge>
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                Connect your Google Calendar to automatically sync booking assignments.
              </div>
              <Button
                variant="primary"
                onClick={handleConnect}
                disabled={connecting}
                leftIcon={<i className="fab fa-google" />}
              >
                {connecting ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Upcoming Bookings */}
      <Card>
        <SectionHeader title="Upcoming Bookings" />
        <div style={{ padding: tokens.spacing[4] }}>
          {upcomingBookings.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No upcoming bookings"
              description="Bookings will appear here once assigned"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  style={{
                    padding: tokens.spacing[3],
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.borderRadius.md,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: tokens.spacing[2],
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                        {booking.firstName} {booking.lastName}
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        {booking.service}
                      </div>
                    </div>
                    <Badge variant={booking.status === 'confirmed' ? 'success' : 'default'}>
                      {booking.status}
                    </Badge>
                  </div>
                  <BookingScheduleDisplay
                    service={booking.service}
                    startAt={booking.startAt}
                    endAt={booking.endAt}
                  />
                  {booking.address && (
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      <i className="fas fa-map-marker-alt" style={{ marginRight: tokens.spacing[2] }} />
                      {booking.address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
