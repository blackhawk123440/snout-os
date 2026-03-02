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
import { Button, Modal } from '@/components/ui';

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/client/delete-account', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      setDeleteModalOpen(false);
      await signOut({ callbackUrl: '/login' });
      window.location.href = '/login';
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

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
              <a
                href="/client/settings/export"
                className="mb-3 block w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Export your data
              </a>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="mb-3 w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Sign out
              </button>
            </AppCardBody>
          </AppCard>

          <AppCard className="border-red-200">
            <AppCardBody>
              <p className="mb-2 text-sm font-medium text-neutral-900">Delete account</p>
              <p className="mb-3 text-xs text-neutral-600">
                Permanently delete your account. Export your data first if you want to keep a copy. This cannot be undone.
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeleteModalOpen(true)}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Delete account
              </Button>
            </AppCardBody>
          </AppCard>
        </div>
      ) : null}

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title="Delete account"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleDeleteAccount()}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete account'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-neutral-600">
          Are you sure? This will permanently delete your account. You will be signed out immediately and cannot sign
          in again.
        </p>
      </Modal>
    </div>
  );
}
