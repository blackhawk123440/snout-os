/**
 * Staff Scheduling Grid — /schedule-grid
 *
 * Sitter × Day grid showing bookings, hours, and availability.
 * Connected to GET /api/ops/schedule-grid.
 */

'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
                icon={<ChevronLeft size={16} />}
                onClick={() => navigate(-1)}
                aria-label="Previous week"
              />
              <Button size="sm" variant="secondary" onClick={goToday}>Today</Button>
              <IconButton
                icon={<ChevronRight size={16} />}
                onClick={() => navigate(1)}
                aria-label="Next week"
              />
            </Flex>
          }
        />

        <div className="px-4">
          <p className="text-sm text-text-secondary mb-3">
            {weekLabel}
          </p>
        </div>

        {isLoading ? (
          <div className="p-4"><Skeleton height="400px" /></div>
        ) : error ? (
          <div className="p-4">
            <EmptyState title="Error" description={(error as Error).message} />
          </div>
        ) : !data || data.sitters.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No sitters" description="Add sitters to see the schedule grid." />
          </div>
        ) : (
          <div className="p-4 overflow-x-auto">
            <Panel>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th
                      className="text-left p-3 border-b-2 border-border-default font-semibold text-text-secondary"
                      style={{ minWidth: 140 }}
                    >
                      Sitter
                    </th>
                    {data.totals.days.map((day) => {
                      const d = new Date(day.date + 'T12:00:00');
                      const isToday = day.date === new Date().toISOString().slice(0, 10);
                      return (
                        <th key={day.date}
                          className={`text-center p-3 border-b-2 border-border-default font-semibold ${isToday ? 'text-primary bg-accent-primary' : 'text-text-secondary'}`}
                          style={{ minWidth: 120 }}
                        >
                          <div>{DAY_LABELS[d.getDay()]}</div>
                          <div className="text-xs font-normal">
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
                      <td className="p-3 border-b border-border-default font-medium text-text-primary">
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
                            className="p-2 border-b border-border-default text-center align-top"
                            style={{
                              cursor: day.bookingCount > 0 ? 'pointer' : 'default',
                              backgroundColor: !day.available
                                ? '#fef2f2'
                                : isToday
                                ? tokens.colors.accent.primary
                                : day.bookingCount > 6
                                ? '#fef3c7'
                                : undefined,
                            }}
                          >
                            {!day.available ? (
                              <Badge variant="error">Off</Badge>
                            ) : day.bookingCount === 0 ? (
                              <span className="text-text-tertiary">—</span>
                            ) : (
                              <div>
                                <div className="font-semibold text-text-primary">
                                  {day.bookingCount}
                                </div>
                                <div className="text-xs text-text-tertiary">
                                  {day.totalHours.toFixed(1)}h
                                </div>
                                {isExpanded && (
                                  <div className="mt-2 text-left flex flex-col gap-1">
                                    {day.bookings.map((b) => (
                                      <div
                                        key={b.id}
                                        onClick={(e) => { e.stopPropagation(); router.push(`/bookings/${b.id}`); }}
                                        className="text-xs px-2 py-1 bg-surface-secondary rounded-sm cursor-pointer"
                                      >
                                        <div className="font-medium">{formatTime(b.startAt)}</div>
                                        <div className="text-text-secondary">{b.clientName}</div>
                                        <div className="text-text-tertiary">{b.service}</div>
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
                  <tr className="bg-surface-secondary">
                    <td className="p-3 font-bold text-text-primary">
                      Team Total
                    </td>
                    {data.totals.days.map((day) => (
                      <td key={day.date} className="p-3 text-center font-semibold text-text-primary">
                        <div>{day.totalBookings} bookings</div>
                        <div className="text-xs text-text-tertiary">
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
