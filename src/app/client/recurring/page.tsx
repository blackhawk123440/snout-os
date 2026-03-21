'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import {
  AppSkeletonList,
  AppErrorState,
} from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  useClientRecurringSchedules,
  useUpdateRecurringSchedule,
  useCancelRecurringSchedule,
} from '@/lib/api/client-hooks';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function statusColor(s: string) {
  switch (s) {
    case 'active': return 'bg-green-50 text-green-700 border-green-200';
    case 'paused': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'pending': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'cancelled': return 'bg-neutral-100 text-neutral-500 border-neutral-200';
    default: return 'bg-neutral-100 text-neutral-600 border-neutral-200';
  }
}

export default function ClientRecurringPage() {
  const { data, isLoading, error, refetch } = useClientRecurringSchedules();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const cancelMutation = useCancelRecurringSchedule(cancelId || '');
  const pauseMutation = useUpdateRecurringSchedule(actionId || '');

  const schedules = data?.schedules ?? [];
  const active = schedules.filter((s: any) => s.status === 'active' || s.status === 'pending');
  const inactive = schedules.filter((s: any) => s.status === 'paused' || s.status === 'cancelled');

  async function handlePauseResume(id: string, currentStatus: string) {
    setActionId(id);
    try {
      await pauseMutation.mutateAsync({
        action: currentStatus === 'active' ? 'pause' : 'resume',
      });
    } catch {}
    setActionId(null);
  }

  async function handleCancel() {
    if (!cancelId) return;
    try {
      await cancelMutation.mutateAsync();
    } catch {}
    setCancelId(null);
  }

  if (error) {
    return (
      <LayoutWrapper>
        <AppErrorState message="Could not load recurring schedules." onRetry={refetch} />
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Recurring Bookings</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your regular pet care schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClientRefreshButton onRefresh={refetch} />
          <Link href="/client/bookings/new">
            <Button size="sm">New Booking</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <AppSkeletonList count={3} />
      ) : schedules.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
          <h2 className="text-lg font-semibold text-text-primary mb-1">No recurring schedules</h2>
          <p className="text-sm text-text-secondary mb-4">
            Set up a regular schedule so you never have to book the same service twice.
          </p>
          <Link href="/client/bookings/new">
            <Button>Book a Visit</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Active Schedules
              </h2>
              <div className="space-y-3">
                {active.map((s: any) => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    onPauseResume={() => handlePauseResume(s.id, s.status)}
                    onCancel={() => setCancelId(s.id)}
                    actionLoading={actionId === s.id}
                  />
                ))}
              </div>
            </section>
          )}

          {inactive.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Paused &amp; Cancelled
              </h2>
              <div className="space-y-3">
                {inactive.map((s: any) => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    onPauseResume={() => handlePauseResume(s.id, s.status)}
                    onCancel={() => setCancelId(s.id)}
                    actionLoading={actionId === s.id}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancel Recurring Schedule"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will cancel the recurring schedule and all future bookings associated with it.
            Completed visits will not be affected.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setCancelId(null)}>
              Keep Schedule
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCancel}
              isLoading={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </LayoutWrapper>
  );
}

function ScheduleCard({
  schedule,
  onPauseResume,
  onCancel,
  actionLoading,
}: {
  schedule: any;
  onPauseResume: () => void;
  onCancel: () => void;
  actionLoading: boolean;
}) {
  const days: number[] = schedule.daysOfWeek || [];
  const dayLabels = days.length > 0
    ? days.map((d: number) => DAY_LABELS[d]).join(', ')
    : schedule.frequency;

  return (
    <div className="rounded-xl border border-border-default bg-surface-primary p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-primary truncate">
              {schedule.service}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(schedule.status)}`}>
              {schedule.status}
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} &middot; {dayLabels}
          </p>
          <p className="text-sm text-text-secondary">
            {formatTime(schedule.startTime)} &ndash; {formatTime(schedule.endTime)}
          </p>
          {schedule.totalPrice > 0 && (
            <p className="text-sm font-medium text-text-primary mt-1">
              ${schedule.totalPrice.toFixed(2)} per visit
            </p>
          )}
          {schedule.effectiveUntil && (
            <p className="text-xs text-text-tertiary mt-1">
              Until {new Date(schedule.effectiveUntil).toLocaleDateString()}
            </p>
          )}
        </div>
        {schedule.status !== 'cancelled' && (
          <div className="flex items-center gap-2 shrink-0">
            {(schedule.status === 'active' || schedule.status === 'paused') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onPauseResume}
                isLoading={actionLoading}
              >
                {schedule.status === 'active' ? 'Pause' : 'Resume'}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onCancel}
              className="text-red-600 hover:text-red-700"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
