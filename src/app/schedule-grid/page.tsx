/**
 * Staff Scheduling Grid — /schedule-grid
 *
 * Sitter × Day grid showing bookings, hours, and availability.
 * Connected to GET /api/ops/schedule-grid.
 */

'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { OwnerAppShell, LayoutWrapper, PageHeader } from '@/components/layout';
import { Panel, Button, Badge, Skeleton, EmptyState, Flex, IconButton } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

interface GridBooking {
  id: string;
  service: string;
  startAt: string;
  endAt: string;
  clientName: string;
  status: string;
}

interface GridDay {
  date: string;
  bookings: GridBooking[];
  bookingCount: number;
  totalHours: number;
  available: boolean;
}

interface GridSitter {
  id: string;
  firstName: string;
  lastName: string;
  days: GridDay[];
}

interface GridData {
  weekStart: string;
  sitters: GridSitter[];
  totals: {
    days: Array<{ date: string; totalBookings: number; activeSitters: number }>;
  };
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateShort(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export default function ScheduleGridPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);

  const { data, isLoading, error } = useQuery<GridData>({
    queryKey: ['schedule-grid', weekStart],
    queryFn: async () => {
      const res = await fetch(`/api/ops/schedule-grid?date=${weekStart}`);
      if (!res.ok) throw new Error('Failed to load schedule grid');
      return res.json();
    },
  });

  const navigate = (offset: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + offset * 7);
    setCurrentDate(next);
  };

  const goToday = () => setCurrentDate(new Date());

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + 6);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [weekStart]);

  const weekLabel = `${formatDateShort(weekStart)} – ${weekEnd}`;

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Schedule Grid"
          subtitle="Staff coverage by day — bookings, hours, and availability"
          actions={
            <Flex align="center" gap={2}>
              <IconButton
                icon={<i className="fas fa-chevron-left" />}
                onClick={() => navigate(-1)}
                aria-label="Previous week"
              />
              <Button size="sm" variant="secondary" onClick={goToday}>Today</Button>
              <IconButton
                icon={<i className="fas fa-chevron-right" />}
                onClick={() => navigate(1)}
                aria-label="Next week"
              />
            </Flex>
          }
        />

        <div style={{ padding: `0 ${tokens.spacing[4]}` }}>
          <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[3] }}>
            {weekLabel}
          </p>
        </div>

        {isLoading ? (
          <div style={{ padding: tokens.spacing[4] }}><Skeleton height="400px" /></div>
        ) : error ? (
          <div style={{ padding: tokens.spacing[4] }}>
            <EmptyState title="Error" description={(error as Error).message} />
          </div>
        ) : !data || data.sitters.length === 0 ? (
          <div style={{ padding: tokens.spacing[4] }}>
            <EmptyState title="No sitters" description="Add sitters to see the schedule grid." />
          </div>
        ) : (
          <div style={{ padding: tokens.spacing[4], overflowX: 'auto' }}>
            <Panel>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tokens.typography.fontSize.sm[0] }}>
                <thead>
                  <tr>
                    <th style={{
                      textAlign: 'left', padding: tokens.spacing[3],
                      borderBottom: `2px solid ${tokens.colors.border.default}`,
                      fontWeight: tokens.typography.fontWeight.semibold,
                      color: tokens.colors.text.secondary,
                      minWidth: 140,
                    }}>
                      Sitter
                    </th>
                    {data.totals.days.map((day) => {
                      const d = new Date(day.date + 'T12:00:00');
                      const isToday = day.date === new Date().toISOString().slice(0, 10);
                      return (
                        <th key={day.date} style={{
                          textAlign: 'center', padding: tokens.spacing[3],
                          borderBottom: `2px solid ${tokens.colors.border.default}`,
                          fontWeight: tokens.typography.fontWeight.semibold,
                          color: isToday ? tokens.colors.primary.DEFAULT : tokens.colors.text.secondary,
                          backgroundColor: isToday ? tokens.colors.accent.primary : undefined,
                          minWidth: 120,
                        }}>
                          <div>{DAY_LABELS[d.getDay()]}</div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.normal }}>
                            {formatDateShort(day.date)}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.sitters.map((sitter) => (
                    <tr key={sitter.id}>
                      <td style={{
                        padding: tokens.spacing[3],
                        borderBottom: `1px solid ${tokens.colors.border.default}`,
                        fontWeight: tokens.typography.fontWeight.medium,
                        color: tokens.colors.text.primary,
                      }}>
                        {sitter.firstName} {sitter.lastName}
                      </td>
                      {sitter.days.map((day) => {
                        const cellKey = `${sitter.id}:${day.date}`;
                        const isExpanded = expandedCell === cellKey;
                        const isToday = day.date === new Date().toISOString().slice(0, 10);
                        return (
                          <td
                            key={day.date}
                            onClick={() => setExpandedCell(isExpanded ? null : cellKey)}
                            style={{
                              padding: tokens.spacing[2],
                              borderBottom: `1px solid ${tokens.colors.border.default}`,
                              textAlign: 'center',
                              cursor: day.bookingCount > 0 ? 'pointer' : 'default',
                              backgroundColor: !day.available
                                ? '#fef2f2'
                                : isToday
                                ? tokens.colors.accent.primary
                                : day.bookingCount > 6
                                ? '#fef3c7'
                                : undefined,
                              verticalAlign: 'top',
                            }}
                          >
                            {!day.available ? (
                              <Badge variant="error">Off</Badge>
                            ) : day.bookingCount === 0 ? (
                              <span style={{ color: tokens.colors.text.tertiary }}>—</span>
                            ) : (
                              <div>
                                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.primary }}>
                                  {day.bookingCount}
                                </div>
                                <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary }}>
                                  {day.totalHours.toFixed(1)}h
                                </div>
                                {isExpanded && (
                                  <div style={{
                                    marginTop: tokens.spacing[2], textAlign: 'left',
                                    display: 'flex', flexDirection: 'column', gap: 4,
                                  }}>
                                    {day.bookings.map((b) => (
                                      <div
                                        key={b.id}
                                        onClick={(e) => { e.stopPropagation(); router.push(`/bookings/${b.id}`); }}
                                        style={{
                                          fontSize: tokens.typography.fontSize.xs[0],
                                          padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                                          backgroundColor: tokens.colors.surface.secondary,
                                          borderRadius: tokens.radius.sm,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <div style={{ fontWeight: 500 }}>{formatTime(b.startAt)}</div>
                                        <div style={{ color: tokens.colors.text.secondary }}>{b.clientName}</div>
                                        <div style={{ color: tokens.colors.text.tertiary }}>{b.service}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                {/* Team totals row */}
                <tfoot>
                  <tr style={{ backgroundColor: tokens.colors.surface.secondary }}>
                    <td style={{
                      padding: tokens.spacing[3],
                      fontWeight: tokens.typography.fontWeight.bold,
                      color: tokens.colors.text.primary,
                    }}>
                      Team Total
                    </td>
                    {data.totals.days.map((day) => (
                      <td key={day.date} style={{
                        padding: tokens.spacing[3], textAlign: 'center',
                        fontWeight: tokens.typography.fontWeight.semibold,
                        color: tokens.colors.text.primary,
                      }}>
                        <div>{day.totalBookings} bookings</div>
                        <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary }}>
                          {day.activeSitters} sitter{day.activeSitters !== 1 ? 's' : ''}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </Panel>
          </div>
        )}
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
