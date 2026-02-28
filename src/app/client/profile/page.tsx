'use client';

import { useCallback, useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  AppCard,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppErrorState,
} from '@/components/app';

interface MeData {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string | null;
  phone?: string | null;
}

export default function ClientProfilePage() {
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/me');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load profile');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('Unable to load profile');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <AppPageHeader
        title="Profile"
        subtitle="Your account"
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
        }
      />
      {loading ? (
        <AppSkeletonList count={2} />
      ) : error ? (
        <AppErrorState title="Couldn't load profile" subtitle={error} onRetry={() => void load()} />
      ) : data ? (
        <div className="space-y-4">
          <AppCard>
            <AppCardBody>
              <p className="font-semibold text-neutral-900">
                {data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Client'}
              </p>
              {data.email && (
                <p className="mt-1 text-sm text-neutral-600">{data.email}</p>
              )}
            </AppCardBody>
          </AppCard>
          <AppCard>
            <AppCardBody>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Sign out
              </button>
            </AppCardBody>
          </AppCard>
        </div>
      ) : null}
    </div>
  );
}
