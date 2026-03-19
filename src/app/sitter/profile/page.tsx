'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Modal } from '@/components/ui';
import { StatusChip } from '@/components/ui/status-chip';
import { LayoutWrapper } from '@/components/layout';
import { SITTER_PROFILE_LINKS } from '@/lib/sitter-nav';
import { toastError } from '@/lib/toast';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterPageHeader,
  SitterSkeletonList,
  SitterErrorState,
  FeatureStatusPill,
} from '@/components/sitter';
import {
  useSitterProfile,
  useToggleSitterAvailability,
  useAddSitterBlockOff,
  useRemoveSitterBlockOff,
  useConnectSitterStripe,
  useSitterDeleteAccount,
} from '@/lib/api/sitter-portal-hooks';

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

interface StripeStatus {
  connected: boolean;
  onboardingStatus?: string;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
}

export default function SitterProfilePage() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState('');

  const { data: profileData, isLoading: loading, error, refetch } = useSitterProfile();
  const profile = profileData?.profile as SitterProfile | undefined;
  const availability = profileData?.availability;
  const stripe = profileData?.stripe as StripeStatus | null | undefined;

  const toggleAvail = useToggleSitterAvailability();
  const addBlockOff = useAddSitterBlockOff();
  const removeBlock = useRemoveSitterBlockOff();
  const connectStripe = useConnectSitterStripe();
  const deleteAccount = useSitterDeleteAccount();

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get('stripe') === 'return' || searchParams?.get('stripe') === 'refresh') {
      void refetch();
    }
  }, [searchParams, refetch]);

  const availabilityEnabled = availability?.availabilityEnabled ?? profile?.availabilityEnabled ?? true;
  const blockOffs: BlockOffDay[] = Array.isArray(availability?.blockOffDays) ? availability.blockOffDays : [];
  const stripeStatus: StripeStatus = stripe ?? { connected: false };

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      await toggleAvail.mutateAsync(!availabilityEnabled);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to update');
    }
  };

  const handleAddBlockOff = async () => {
    if (!newBlockDate.trim()) return;
    try {
      await addBlockOff.mutateAsync(newBlockDate);
      setNewBlockDate('');
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to add');
    }
  };

  const handleRemoveBlockOff = async (id: string) => {
    try {
      await removeBlock.mutateAsync(id);
    } catch {
      toastError('Failed to remove');
    }
  };

  const handleConnectStripe = async () => {
    try {
      const result = await connectStripe.mutateAsync();
      if (result.onboardingUrl) window.location.href = result.onboardingUrl;
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to connect Stripe');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount.mutateAsync();
      setDeleteModalOpen(false);
      const { signOut } = await import('next-auth/react');
      await signOut({ callbackUrl: '/login' });
      window.location.href = '/login';
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to delete account');
    }
  };

  return (
    <LayoutWrapper variant="narrow">
      <SitterPageHeader title="Profile" subtitle="Your sitter profile" />
      {loading ? (
        <SitterSkeletonList count={2} />
      ) : error ? (
        <SitterErrorState
          title="Couldn't load profile"
          subtitle={error instanceof Error ? error.message : 'Unable to load profile'}
          onRetry={() => void refetch()}
        />
      ) : profile ? (
        <div className="space-y-4">
          <SitterCard>
            <SitterCardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-info-bg text-xl font-semibold text-status-info-text">
                  {profile.name.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <p className="text-lg font-semibold text-text-primary">{profile.name}</p>
                  <p className="text-sm text-text-secondary">{profile.email}</p>
                </div>
              </div>
            </SitterCardHeader>
            <SitterCardBody>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-text-tertiary">Phone</dt>
                  <dd className="text-text-primary">{profile.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-text-tertiary">Status</dt>
                  <dd>
                    <StatusChip variant={profile.active ? 'success' : 'neutral'}>
                      {profile.active ? 'Active' : 'Inactive'}
                    </StatusChip>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-text-tertiary">Commission</dt>
                  <dd className="text-text-primary">{profile.commissionPercentage}%</dd>
                </div>
              </dl>
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardHeader>
              <p className="text-base font-semibold text-text-primary">Stripe Connect</p>
            </SitterCardHeader>
            <SitterCardBody>
              <div className="mb-3 flex items-center gap-2">
                <StatusChip variant={stripeStatus?.connected && stripeStatus.payoutsEnabled ? 'success' : 'warning'}>
                  {stripeStatus?.connected && stripeStatus.payoutsEnabled ? 'Stripe connected' : 'Stripe setup required'}
                </StatusChip>
              </div>
              {stripeStatus?.connected && stripeStatus.payoutsEnabled ? (
                <p className="text-sm text-status-success-text-secondary">Connected · Payouts enabled</p>
              ) : stripeStatus?.connected ? (
                <p className="text-sm text-status-warning-text-secondary">Connected · Complete onboarding to receive payouts</p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-text-secondary">Connect your Stripe account to receive payouts from completed bookings.</p>
                  <Button variant="primary" size="md" onClick={() => void handleConnectStripe()} disabled={connectStripe.isPending}>
                    {connectStripe.isPending ? 'Connecting...' : 'Connect Stripe account'}
                  </Button>
                </>
              )}
            </SitterCardBody>
          </SitterCard>

          <SitterCard className="border-dashed">
            <SitterCardBody>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-secondary">Verification status</p>
                <FeatureStatusPill featureKey="verification" />
              </div>
            </SitterCardBody>
          </SitterCard>
          <SitterCard className="border-dashed">
            <SitterCardBody>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-secondary">Documents</p>
                <FeatureStatusPill featureKey="documents" />
              </div>
            </SitterCardBody>
          </SitterCard>
          <SitterCard className="border-dashed">
            <SitterCardBody>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-secondary">Offline mode</p>
                <FeatureStatusPill featureKey="offline_mode" />
              </div>
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardHeader>
              <h3 className="text-base font-semibold text-text-primary">Dashboard</h3>
            </SitterCardHeader>
            <SitterCardBody className="pt-0">
              <nav className="space-y-1">
                {SITTER_PROFILE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2"
                  >
                    <i className={`${item.icon} w-5 text-center text-text-tertiary`} />
                    {item.label}
                    <FeatureStatusPill featureKey={item.href.replace('/sitter/', '').split('/')[0]} className="ml-auto" />
                  </Link>
                ))}
              </nav>
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardHeader>
              <h3 className="text-base font-semibold text-text-primary">Availability</h3>
            </SitterCardHeader>
            <SitterCardBody>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">Available for new bookings</p>
                  <p className="text-xs text-text-tertiary">When off, you won&apos;t receive new assignments</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={availabilityEnabled}
                  onClick={() => void handleToggleAvailability()}
                  disabled={toggleAvail.isPending}
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

              <div className="mt-6">
                <p className="mb-2 text-sm font-medium text-text-primary">Block off days</p>
                <p className="mb-3 text-xs text-text-tertiary">Days you&apos;re not available</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="rounded-xl border border-border-strong px-3 py-2 text-sm outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus"
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => void handleAddBlockOff()}
                    disabled={!newBlockDate || addBlockOff.isPending}
                  >
                    {addBlockOff.isPending ? 'Adding...' : 'Add'}
                  </Button>
                </div>
                {blockOffs.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {blockOffs.map((b) => (
                      <li key={b.id} className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                        <span>{new Date(b.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveBlockOff(b.id)}
                          className="text-status-danger-text-secondary hover:text-status-danger-text"
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

          <SitterCard className="border-status-danger-border">
            <SitterCardHeader>
              <p className="text-base font-semibold text-text-primary">Delete account</p>
            </SitterCardHeader>
            <SitterCardBody>
              <p className="mb-3 text-sm text-text-secondary">
                Permanently delete your sitter account. This cannot be undone. You will be signed out immediately.
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeleteModalOpen(true)}
                className="border-status-danger-border text-status-danger-text hover:bg-status-danger-bg"
              >
                Delete account
              </Button>
            </SitterCardBody>
          </SitterCard>
        </div>
      ) : null}

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !deleteAccount.isPending && setDeleteModalOpen(false)}
        title="Delete account"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deleteAccount.isPending}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleDeleteAccount()}
              disabled={deleteAccount.isPending}
              className="bg-status-danger-fill text-status-danger-text-on-fill hover:bg-status-danger-fill-hover"
            >
              {deleteAccount.isPending ? 'Deleting...' : 'Delete account'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          Are you sure? This will permanently delete your sitter account. You will be signed out immediately and cannot sign in again.
        </p>
      </Modal>
    </LayoutWrapper>
  );
}
