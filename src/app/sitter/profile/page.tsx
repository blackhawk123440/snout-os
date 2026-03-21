'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { StatusChip } from '@/components/ui/status-chip';
import { Icon } from '@/components/ui/Icon';
import { LayoutWrapper } from '@/components/layout';
import { SITTER_MORE_LINKS } from '@/lib/sitter-nav';
import { toastError } from '@/lib/toast';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterPageHeader,
  SitterSkeletonList,
  SitterErrorState,
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
      <SitterPageHeader title="Profile" subtitle="Account and settings" />
      {loading ? (
        <SitterSkeletonList count={3} />
      ) : error ? (
        <SitterErrorState
          title="Couldn't load profile"
          subtitle={error instanceof Error ? error.message : 'Unable to load profile'}
          onRetry={() => void refetch()}
        />
      ) : profile ? (
        <div className="space-y-4">
          {/* ── Personal Info ────────────────────────────────────────── */}
          <SitterCard>
            <SitterCardBody>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-secondary text-xl font-semibold text-text-brand">
                  {(profile.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-text-primary truncate">{profile.name}</p>
                  <p className="text-sm text-text-secondary truncate">{profile.email}</p>
                  {profile.phone && (
                    <p className="text-sm text-text-tertiary">{profile.phone}</p>
                  )}
                </div>
                <StatusChip variant={profile.active ? 'success' : 'neutral'}>
                  {profile.active ? 'Active' : 'Inactive'}
                </StatusChip>
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-border-default pt-4">
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Commission</p>
                  <p className="text-sm font-semibold text-text-primary">{profile.commissionPercentage}%</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Status</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {availabilityEnabled ? 'Available' : 'Off duty'}
                  </p>
                </div>
              </div>
            </SitterCardBody>
          </SitterCard>

          {/* ── Availability ─────────────────────────────────────────── */}
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
                    className="rounded-xl border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus"
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
                          className="text-status-danger-text-secondary hover:text-status-danger-text text-sm"
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

          {/* ── Stripe Connect ───────────────────────────────────────── */}
          <SitterCard>
            <SitterCardHeader>
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-text-primary">Payouts</p>
                <StatusChip variant={stripeStatus?.connected && stripeStatus.payoutsEnabled ? 'success' : 'warning'}>
                  {stripeStatus?.connected && stripeStatus.payoutsEnabled ? 'Connected' : 'Setup required'}
                </StatusChip>
              </div>
            </SitterCardHeader>
            <SitterCardBody>
              {stripeStatus?.connected && stripeStatus.payoutsEnabled ? (
                <p className="text-sm text-text-secondary">Stripe connected. Payouts are enabled.</p>
              ) : stripeStatus?.connected ? (
                <>
                  <p className="text-sm text-text-secondary mb-3">Stripe connected but onboarding is incomplete. Complete setup to receive payouts.</p>
                  <Button variant="primary" size="md" onClick={() => void handleConnectStripe()} disabled={connectStripe.isPending}>
                    {connectStripe.isPending ? 'Loading...' : 'Complete setup'}
                  </Button>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-text-secondary">Connect your Stripe account to receive payouts from completed bookings.</p>
                  <Button variant="primary" size="md" onClick={() => void handleConnectStripe()} disabled={connectStripe.isPending}>
                    {connectStripe.isPending ? 'Connecting...' : 'Connect Stripe'}
                  </Button>
                </>
              )}
            </SitterCardBody>
          </SitterCard>

          {/* ── More ─────────────────────────────────────────────────── */}
          <SitterCard>
            <SitterCardHeader>
              <h3 className="text-base font-semibold text-text-primary">More</h3>
            </SitterCardHeader>
            <SitterCardBody className="pt-0">
              <nav className="divide-y divide-border-muted -mx-5">
                {SITTER_MORE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[48px] items-center gap-3 px-5 py-3 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
                  >
                    <Icon name={item.icon} className="w-4 h-4 text-text-tertiary shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-disabled shrink-0" />
                  </Link>
                ))}
              </nav>
            </SitterCardBody>
          </SitterCard>

          {/* ── Danger Zone ──────────────────────────────────────────── */}
          <SitterCard className="border-status-danger-border">
            <SitterCardBody>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Delete account</p>
                  <p className="text-xs text-text-tertiary">Permanently remove your sitter account</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeleteModalOpen(true)}
                  className="border-status-danger-border text-status-danger-text hover:bg-status-danger-bg shrink-0"
                >
                  Delete
                </Button>
              </div>
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
