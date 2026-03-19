'use client';

/**
 * RouteMap — Visual route map showing today's stops.
 * Uses static map images (no Mapbox/Google Maps JS SDK needed).
 * Falls back to a list view if no addresses have coordinates.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '@/lib/design-tokens';

interface RouteStop {
  stopNumber: number;
  bookingId: string;
  clientName: string;
  address: string | null;
  service: string;
  startAt: string;
  endAt: string;
  status: string;
  pets: string;
  phone?: string | null;
  notes?: string | null;
  googleMapsUrl?: string | null;
  appleMapsUrl?: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: 'var(--color-status-info-bg)', text: 'var(--color-status-info-text)', label: 'Upcoming' },
  in_progress: { bg: 'var(--color-status-purple-bg)', text: 'var(--color-status-purple-text)', label: 'In Progress' },
  completed: { bg: 'var(--color-status-success-bg)', text: 'var(--color-status-success-text)', label: 'Completed' },
  pending: { bg: 'var(--color-status-warning-bg)', text: 'var(--color-status-warning-text)', label: 'Pending' },
};

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function RouteMap({ date, apiUrl }: { date?: string; apiUrl?: string }) {
  const [expandedStop, setExpandedStop] = useState<string | null>(null);

  const targetDate = date || new Date().toISOString().slice(0, 10);
  const endpoint = apiUrl || `/api/sitter/route?date=${targetDate}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['route-map', endpoint],
    queryFn: async () => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to load route');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <div style={{ height: 200, backgroundColor: 'var(--color-surface-tertiary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--color-text-tertiary)' }}>Loading route...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: tokens.spacing[4], textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Unable to load route
      </div>
    );
  }

  const stops: RouteStop[] = data.stops || [];

  if (stops.length === 0) {
    return (
      <div style={{ padding: tokens.spacing[4], textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 8 }}>🗺️</p>
        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>No stops today</p>
        <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: 'var(--color-text-secondary)' }}>
          Your route will appear here when you have bookings
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Route summary */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
        borderBottom: `1px solid var(--color-border-default)`,
      }}>
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {stops.length} stop{stops.length !== 1 ? 's' : ''} today
          </span>
          <span style={{ marginLeft: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: 'var(--color-text-tertiary)' }}>
            {stops.filter(s => s.status === 'completed').length} completed
          </span>
        </div>
        {data.navigation?.googleMapsUrl && (
          <a
            href={data.navigation.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              minHeight: 44, display: 'inline-flex', alignItems: 'center',
              padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
              borderRadius: 8, fontSize: tokens.typography.fontSize.sm[0],
              fontWeight: 600, color: 'var(--color-text-inverse)',
              backgroundColor: 'var(--color-accent-primary)',
              textDecoration: 'none',
            }}
          >
            Start Route →
          </a>
        )}
      </div>

      {/* Stop list with route line */}
      <div style={{ padding: `${tokens.spacing[2]} ${tokens.spacing[4]}` }}>
        {stops.map((stop, i) => {
          const status = STATUS_STYLES[stop.status] || STATUS_STYLES.pending;
          const isExpanded = expandedStop === stop.bookingId;
          const isLast = i === stops.length - 1;

          return (
            <div key={stop.bookingId} style={{ display: 'flex', gap: tokens.spacing[3] }}>
              {/* Route line + stop number */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: stop.status === 'completed' ? 'var(--color-status-success-fill)' : 'var(--color-accent-primary)',
                  color: 'var(--color-text-inverse)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {stop.status === 'completed' ? '✓' : stop.stopNumber}
                </div>
                {!isLast && (
                  <div style={{
                    width: 2, flex: 1, minHeight: 40,
                    backgroundColor: 'var(--color-border-default)',
                  }} />
                )}
              </div>

              {/* Stop card */}
              <button
                type="button"
                onClick={() => setExpandedStop(isExpanded ? null : stop.bookingId)}
                style={{
                  flex: 1, textAlign: 'left', border: `1px solid var(--color-border-default)`,
                  borderRadius: 12, padding: tokens.spacing[3],
                  marginBottom: tokens.spacing[2], cursor: 'pointer',
                  backgroundColor: stop.status === 'completed' ? 'var(--color-status-success-bg)' : 'var(--color-surface-primary)',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => { if (stop.status !== 'completed') (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-secondary)'; }}
                onMouseLeave={(e) => { if (stop.status !== 'completed') (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-primary)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {formatTime(stop.startAt)} – {formatTime(stop.endAt)}
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {stop.clientName} · {stop.service}
                    </div>
                    {stop.pets && (
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        🐾 {stop.pets}
                      </div>
                    )}
                  </div>
                  <span style={{
                    backgroundColor: status.bg, color: status.text,
                    borderRadius: 12, padding: `2px ${tokens.spacing[2]}`,
                    fontSize: tokens.typography.fontSize.xs[0], fontWeight: 600,
                  }}>
                    {status.label}
                  </span>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop: tokens.spacing[3], borderTop: '1px solid var(--color-border-default)', paddingTop: tokens.spacing[3] }}>
                    {stop.address && (
                      <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: 'var(--color-text-secondary)', marginBottom: tokens.spacing[2] }}>
                        📍 {stop.address}
                      </p>
                    )}
                    {stop.notes && (
                      <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginBottom: tokens.spacing[2] }}>
                        {stop.notes}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                      {stop.googleMapsUrl && (
                        <a
                          href={stop.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            minHeight: 44, display: 'inline-flex', alignItems: 'center',
                            padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                            borderRadius: 8, border: '1px solid var(--color-border-default)',
                            fontSize: tokens.typography.fontSize.sm[0], fontWeight: 500,
                            color: 'var(--color-text-primary)', textDecoration: 'none',
                          }}
                        >
                          Navigate →
                        </a>
                      )}
                      <a
                        href={`/sitter/bookings/${stop.bookingId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          minHeight: 44, display: 'inline-flex', alignItems: 'center',
                          padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                          borderRadius: 8, border: '1px solid var(--color-border-default)',
                          fontSize: tokens.typography.fontSize.sm[0], fontWeight: 500,
                          color: 'var(--color-text-primary)', textDecoration: 'none',
                        }}
                      >
                        View Booking
                      </a>
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
