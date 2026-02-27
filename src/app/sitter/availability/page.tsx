'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Button } from '@/components/ui';
import { FeatureStatusPill } from '@/components/sitter/FeatureStatusPill';

interface BlockOffDay {
  id: string;
  date: string;
}

export default function SitterAvailabilityPage() {
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [blockOffs, setBlockOffs] = useState<BlockOffDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sitter/availability');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load availability');
        setAvailabilityEnabled(true);
        setBlockOffs([]);
        return;
      }
      setAvailabilityEnabled(json.availabilityEnabled ?? true);
      setBlockOffs(Array.isArray(json.blockOffDays) ? json.blockOffDays : []);
    } catch {
      setError('Unable to load availability');
      setBlockOffs([]);
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
      alert('Failed to update');
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
      alert(e instanceof Error ? e.message : 'Failed');
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
      alert('Failed to remove');
    }
  };

  return (
    <>
      <PageHeader title="Availability" description="When you're available for bookings" />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        {loading ? (
          <div className="animate-pulse space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
            <div className="h-6 w-32 rounded bg-neutral-200" />
            <div className="h-4 w-full rounded bg-neutral-100" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
            <p className="text-sm text-neutral-600">{error}</p>
            <Button variant="secondary" size="md" className="mt-4" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-neutral-900">Available for new bookings</p>
                  <p className="text-sm text-neutral-500">When off, you won&apos;t receive new assignments</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={availabilityEnabled}
                  onClick={() => void toggleAvailability()}
                  disabled={toggling}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    availabilityEnabled ? 'bg-blue-600' : 'bg-neutral-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                      availabilityEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <p className="mb-2 font-medium text-neutral-900">Block off dates</p>
              <p className="mb-3 text-sm text-neutral-500">Days you&apos;re not available</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={newBlockDate}
                  onChange={(e) => setNewBlockDate(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <Button variant="secondary" size="md" onClick={() => void addBlockOff()} disabled={!newBlockDate || adding}>
                  {adding ? 'Adding...' : 'Add'}
                </Button>
              </div>
              {blockOffs.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {blockOffs.map((b) => (
                    <li key={b.id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                      <span>{new Date(b.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <button type="button" onClick={() => void removeBlockOff(b.id)} className="text-red-600 hover:text-red-700">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-700">Recurring blocks</p>
                <FeatureStatusPill featureKey="recurring_blocks" />
              </div>
              <p className="mt-1 text-xs text-neutral-500">Weekly recurring unavailability</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
