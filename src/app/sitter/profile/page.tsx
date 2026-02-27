'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { SITTER_PROFILE_LINKS } from '@/lib/sitter-nav';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterPageHeader,
  SitterSkeletonList,
  SitterErrorState,
  FeatureStatusPill,
} from '@/components/sitter';

interface SitterProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
  commissionPercentage: number;
  availabilityEnabled?: boolean;
  name: string;
}

interface BlockOffDay {
  id: string;
  date: string;
}

export default function SitterProfilePage() {
  const [profile, setProfile] = useState<SitterProfile | null>(null);
  const [blockOffs, setBlockOffs] = useState<BlockOffDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, availRes] = await Promise.all([
        fetch('/api/sitter/me'),
        fetch('/api/sitter/availability'),
      ]);
      const meJson = await meRes.json().catch(() => ({}));
      const availJson = await availRes.json().catch(() => ({}));
      if (!meRes.ok) {
        setError(meJson.error || 'Unable to load profile');
        setProfile(null);
        return;
      }
      setProfile({ ...meJson, availabilityEnabled: availJson.availabilityEnabled ?? meJson.availabilityEnabled ?? true });
      setBlockOffs(Array.isArray(availJson.blockOffDays) ? availJson.blockOffDays : []);
    } catch {
      setError('Unable to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const toggleAvailability = async () => {
    if (!profile) return;
    setTogglingAvailability(true);
    try {
      const enabled = !profile.availabilityEnabled;
      const res = await fetch('/api/sitter/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilityEnabled: enabled }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      setProfile((p) => (p ? { ...p, availabilityEnabled: enabled } : null));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setTogglingAvailability(false);
    }
  };

  const addBlockOff = async () => {
    if (!newBlockDate.trim()) return;
    setAddingBlock(true);
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
      alert(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAddingBlock(false);
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
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader title="Profile" subtitle="Your sitter profile" />
      {loading ? (
        <SitterSkeletonList count={2} />
      ) : error ? (
        <SitterErrorState
          title="Couldn't load profile"
          subtitle={error}
          onRetry={() => void loadProfile()}
        />
      ) : profile ? (
        <div className="space-y-4">
          <SitterCard>
            <SitterCardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-600">
                  {profile.name.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <p className="text-lg font-semibold text-neutral-900">{profile.name}</p>
                  <p className="text-sm text-neutral-600">{profile.email}</p>
                </div>
              </div>
            </SitterCardHeader>
            <SitterCardBody>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-neutral-500">Phone</dt>
                  <dd className="text-neutral-900">{profile.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-neutral-500">Status</dt>
                  <dd>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        profile.active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {profile.active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-neutral-500">Commission</dt>
                  <dd className="text-neutral-900">{profile.commissionPercentage}%</dd>
                </div>
              </dl>
            </SitterCardBody>
          </SitterCard>

          <SitterCard className="border-dashed">
            <SitterCardBody>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-700">Verification status</p>
                <FeatureStatusPill featureKey="verification" />
              </div>
            </SitterCardBody>
          </SitterCard>
          <SitterCard className="border-dashed">
            <SitterCardBody>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-700">Documents</p>
                <FeatureStatusPill featureKey="documents" />
              </div>
            </SitterCardBody>
          </SitterCard>
          <SitterCard className="border-dashed">
            <SitterCardBody>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-700">Offline mode</p>
                <FeatureStatusPill featureKey="offline_mode" />
              </div>
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardHeader>
              <h3 className="text-base font-semibold text-neutral-900">Dashboard</h3>
            </SitterCardHeader>
            <SitterCardBody className="pt-0">
              <nav className="space-y-1">
                {SITTER_PROFILE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <i className={`${item.icon} w-5 text-center text-neutral-500`} />
                    {item.label}
                    <FeatureStatusPill featureKey={item.href.replace('/sitter/', '').split('/')[0]} className="ml-auto" />
                  </Link>
                ))}
              </nav>
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardHeader>
              <h3 className="text-base font-semibold text-neutral-900">Availability</h3>
            </SitterCardHeader>
            <SitterCardBody>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Available for new bookings</p>
                  <p className="text-xs text-gray-500">When off, you won&apos;t receive new assignments</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.availabilityEnabled}
                  onClick={() => void toggleAvailability()}
                  disabled={togglingAvailability}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    profile.availabilityEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                      profile.availabilityEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-sm font-medium text-neutral-900">Block off days</p>
                <p className="mb-3 text-xs text-neutral-500">Days you&apos;re not available</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => void addBlockOff()}
                    disabled={!newBlockDate || addingBlock}
                  >
                    {addingBlock ? 'Adding...' : 'Add'}
                  </Button>
                </div>
                {blockOffs.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {blockOffs.map((b) => (
                      <li key={b.id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                        <span>{new Date(b.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <button
                          type="button"
                          onClick={() => void removeBlockOff(b.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SitterCardBody>
          </SitterCard>
        </div>
      ) : null}
    </div>
  );
}
