'use client';

import { useCallback, useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { LayoutWrapper, PageHeader, Section, ClientRefreshButton } from '@/components/layout';
import {
  AppCard,
  AppCardBody,
  AppErrorState,
} from '@/components/app';
import { PageSkeleton } from '@/components/ui/loading-state';
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
    <LayoutWrapper variant="narrow">
      <PageHeader
        title="Profile"
        subtitle="Your account"
        actions={<ClientRefreshButton onRefresh={load} loading={loading} />}
      />
      <Section>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load profile" subtitle={error} onRetry={() => void load()} />
      ) : data ? (
        <div className="flex flex-col gap-6">
          <AppCard>
            <AppCardBody>
              <p className="font-semibold text-slate-900">
                {data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Client'}
              </p>
              {data.email && (
                <p className="mt-1 text-sm text-slate-500">{data.email}</p>
              )}
            </AppCardBody>
          </AppCard>
          <AppCard className="shadow-none">
            <AppCardBody>
              <a
                href="/client/settings/export"
                className="mb-3 block w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Export your data
              </a>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </AppCardBody>
          </AppCard>

          <AppCard className="border-slate-200 shadow-none">
            <AppCardBody>
              <p className="mb-2 text-sm font-medium text-slate-900">Delete account</p>
              <p className="mb-3 text-xs text-slate-500">
                Permanently delete your account. Export your data first if you want to keep a copy. This cannot be undone.
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeleteModalOpen(true)}
                className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
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
        <p className="text-sm text-slate-500">
          Are you sure? This will permanently delete your account. You will be signed out immediately and cannot sign
          in again.
        </p>
      </Modal>
      </Section>
    </LayoutWrapper>
  );
}
