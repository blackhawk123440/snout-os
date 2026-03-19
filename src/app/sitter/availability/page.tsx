'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { LayoutWrapper } from '@/components/layout';
import { toastError } from '@/lib/toast';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterPageHeader,
  SitterSkeletonList,
  SitterErrorState,
} from '@/components/sitter';
import { useSitterAvailabilityFull, useToggleSitterAvailability, useAddSitterBlockOff, useRemoveSitterBlockOff } from '@/lib/api/sitter-portal-hooks';

interface BlockOffDay {
  id: string;
  date: string;
}

interface AvailabilityRule {
  id: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  timezone?: string;
}

interface AvailabilityOverride {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface PreviewWindow {
  start: string;
  end: string;
}

export default function SitterAvailabilityPage() {
  const { data, isLoading: loading, error, refetch } = useSitterAvailabilityFull();
  const [newBlockDate, setNewBlockDate] = useState('');

  const availabilityEnabled = data?.availabilityEnabled ?? true;
  const blockOffs: BlockOffDay[] = Array.isArray(data?.blockOffDays) ? data.blockOffDays : [];
  const rules: AvailabilityRule[] = Array.isArray(data?.rules) ? data.rules : [];
  const overrides: AvailabilityOverride[] = Array.isArray(data?.overrides) ? data.overrides : [];
  const preview: PreviewWindow[] = Array.isArray(data?.preview) ? data.preview : [];

  const toggleMutation = useToggleSitterAvailability();
  const addBlockMutation = useAddSitterBlockOff();
  const removeBlockMutation = useRemoveSitterBlockOff();

  const toggleAvailability = () => {
    toggleMutation.mutate(!availabilityEnabled, {
      onError: () => toastError('Failed to update'),
    });
  };

  const addBlockOff = () => {
    if (!newBlockDate.trim()) return;
    addBlockMutation.mutate(newBlockDate, {
      onSuccess: () => setNewBlockDate(''),
      onError: (e) => toastError(e instanceof Error ? e.message : 'Failed'),
    });
  };

  const removeBlockOff = (id: string) => {
    removeBlockMutation.mutate(id, {
      onError: () => toastError('Failed to remove'),
    });
  };

  return (
    <LayoutWrapper variant="narrow">
      <SitterPageHeader
        title="Availability"
        subtitle="When you're available for bookings"
        action={
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      {loading ? (
        <SitterSkeletonList count={2} />
      ) : error ? (
        <SitterErrorState
          title="Couldn't load availability"
          subtitle={error instanceof Error ? error.message : String(error)}
          onRetry={() => void refetch()}
        />
      ) : (
        <div className="space-y-4">
          <SitterCard>
            <SitterCardBody>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-text-primary">Available for new bookings</p>
                  <p className="text-sm text-text-tertiary">When off, you won&apos;t receive new assignments</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={availabilityEnabled}
                  onClick={() => void toggleAvailability()}
                  disabled={toggleMutation.isPending}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:opacity-50 ${
                    availabilityEnabled ? 'bg-accent-primary' : 'bg-surface-tertiary'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-primary shadow ring-0 transition ${
                      availabilityEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardHeader>
              <p className="font-medium text-text-primary">Block off dates</p>
            </SitterCardHeader>
            <SitterCardBody>
              <p className="mb-3 text-sm text-text-tertiary">Days you&apos;re not available</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={newBlockDate}
                  onChange={(e) => setNewBlockDate(e.target.value)}
                  className="rounded-xl border border-border-strong px-3 py-2 text-sm outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus"
                />
                <Button variant="secondary" size="md" onClick={() => void addBlockOff()} disabled={!newBlockDate || addBlockMutation.isPending}>
                  {addBlockMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
              {blockOffs.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {blockOffs.map((b) => (
                    <li key={b.id} className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                      <span>{new Date(b.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void removeBlockOff(b.id)} className="text-status-danger-text-secondary hover:text-status-danger-text">
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardHeader>
              <p className="font-medium text-text-primary">Recurring availability</p>
            </SitterCardHeader>
            <SitterCardBody>
              <p className="mb-3 text-sm text-text-tertiary">Weekly windows when you&apos;re available (e.g., Mon–Fri 9–5)</p>
              {rules.length === 0 ? (
                <p className="text-sm text-text-tertiary">No recurring rules. Add rules via API or ops.</p>
              ) : (
                <ul className="space-y-2">
                  {rules.map((r) => {
                    const days = (() => {
                      try {
                        const d = JSON.parse(r.daysOfWeek);
                        return Array.isArray(d) ? d : [];
                      } catch {
                        return [];
                      }
                    })();
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const labels = days.map((i: number) => dayNames[i]).join(', ');
                    return (
                      <li key={r.id} className="rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                        {labels}: {r.startTime}–{r.endTime}
                      </li>
                    );
                  })}
                </ul>
              )}
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardHeader>
              <p className="font-medium text-text-primary">Availability preview (next 7 days)</p>
            </SitterCardHeader>
            <SitterCardBody>
              {preview.length === 0 ? (
                <p className="text-sm text-text-tertiary">No availability windows in the next 7 days. Add recurring rules above.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {preview.slice(0, 14).map((w, i) => (
                    <li key={i} className="text-text-secondary">
                      {new Date(w.start).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – {new Date(w.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </li>
                  ))}
                  {preview.length > 14 && (
                    <li className="text-text-tertiary">…and {preview.length - 14} more</li>
                  )}
                </ul>
              )}
            </SitterCardBody>
          </SitterCard>
        </div>
      )}
    </LayoutWrapper>
  );
}
