'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [blockOffs, setBlockOffs] = useState<BlockOffDay[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [preview, setPreview] = useState<PreviewWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sitter/availability?preview=7');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load availability');
        setAvailabilityEnabled(true);
        setBlockOffs([]);
        setRules([]);
        setOverrides([]);
        setPreview([]);
        return;
      }
      setAvailabilityEnabled(json.availabilityEnabled ?? true);
      setBlockOffs(Array.isArray(json.blockOffDays) ? json.blockOffDays : []);
      setRules(Array.isArray(json.rules) ? json.rules : []);
      setOverrides(Array.isArray(json.overrides) ? json.overrides : []);
      setPreview(Array.isArray(json.preview) ? json.preview : []);
    } catch {
      setError('Unable to load availability');
      setBlockOffs([]);
      setRules([]);
      setOverrides([]);
      setPreview([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleAvailability = async () => {
    setToggling(true);
    try {
      const enabled = !availabilityEnabled;
      const res = await fetch('/api/sitter/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilityEnabled: enabled }),
      });
      if (!res.ok) throw new Error('Failed');
      setAvailabilityEnabled(enabled);
    } catch {
      toastError('Failed to update');
    } finally {
      setToggling(false);
    }
  };

  const addBlockOff = async () => {
    if (!newBlockDate.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/sitter/block-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newBlockDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      setBlockOffs((prev) => [...prev, { id: json.id, date: json.date }]);
      setNewBlockDate('');
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setAdding(false);
    }
  };

  const removeBlockOff = async (id: string) => {
    try {
      const res = await fetch(`/api/sitter/block-off/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setBlockOffs((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toastError('Failed to remove');
    }
  };

  return (
    <LayoutWrapper variant="narrow">
      <SitterPageHeader
        title="Availability"
        subtitle="When you're available for bookings"
        action={
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      {loading ? (
        <SitterSkeletonList count={2} />
      ) : error ? (
        <SitterErrorState
          title="Couldn't load availability"
          subtitle={error}
          onRetry={() => void load()}
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
                  disabled={toggling}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:opacity-50 ${
                    availabilityEnabled ? 'bg-blue-600' : 'bg-surface-tertiary'
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
                <Button variant="secondary" size="md" onClick={() => void addBlockOff()} disabled={!newBlockDate || adding}>
                  {adding ? 'Adding...' : 'Add'}
                </Button>
              </div>
              {blockOffs.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {blockOffs.map((b) => (
                    <li key={b.id} className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                      <span>{new Date(b.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void removeBlockOff(b.id)} className="text-red-600 hover:text-red-700">
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
