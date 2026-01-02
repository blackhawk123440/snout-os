/**
 * Tiers Settings Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  Table,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';

interface SitterTier {
  id: string;
  name: string;
  pointTarget: number;
  minCompletionRate: number;
  minResponseRate: number;
  priorityLevel: number;
  canTakeHouseSits: boolean;
  canTakeTwentyFourHourCare: boolean;
  isDefault: boolean;
  benefits: string;
}

export default function TiersPage() {
  const [tiers, setTiers] = useState<SitterTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<SitterTier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchTiers();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchTiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sitter-tiers');
      const data = await response.json();
      setTiers((data.tiers || []).sort((a: SitterTier, b: SitterTier) => a.priorityLevel - b.priorityLevel));
    } catch (err) {
      setError('Failed to load tiers');
      setTiers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (tier: SitterTier) => {
    setTierToDelete(tier);
    setDeleteModalOpen(true);
  };

  const deleteTier = async () => {
    if (!tierToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/sitter-tiers/${tierToDelete.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSuccessMessage('Tier deleted!');
        setDeleteModalOpen(false);
        setTierToDelete(null);
        fetchTiers();
      } else {
        setError('Failed to delete tier');
      }
    } catch (err) {
      setError('Failed to delete tier');
    } finally {
      setDeleting(false);
    }
  };

  const calculateTiers = async () => {
    setCalculating(true);
    setError(null);
    try {
      const response = await fetch('/api/sitter-tiers/calculate', {
        method: 'POST',
      });
      if (response.ok) {
        setSuccessMessage('Tier calculation started!');
      } else {
        setError('Failed to calculate tiers');
      }
    } catch (err) {
      setError('Failed to calculate tiers');
    } finally {
      setCalculating(false);
    }
  };

  const tableColumns: TableColumn<SitterTier>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (tier) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{tier.name}</div>
          {tier.isDefault && <Badge variant="warning">Default</Badge>}
          <Badge variant="info">Priority: {tier.priorityLevel}</Badge>
        </div>
      ),
    },
    {
      key: 'pointTarget',
      header: 'Point Target',
      render: (tier) => <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{tier.pointTarget}</div>,
      align: 'right',
    },
    {
      key: 'completion',
      header: 'Min Completion',
      render: (tier) => <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{tier.minCompletionRate}%</div>,
      align: 'right',
    },
    {
      key: 'response',
      header: 'Min Response',
      render: (tier) => <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{tier.minResponseRate}%</div>,
      align: 'right',
    },
    {
      key: 'capabilities',
      header: 'Capabilities',
      render: (tier) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
          {tier.canTakeHouseSits && <Badge variant="success">House Sits</Badge>}
          {tier.canTakeTwentyFourHourCare && <Badge variant="info">24hr Care</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (tier) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
          <Link href={`/settings/tiers/${tier.id}`}>
            <Button variant="tertiary" size="sm">
              Edit
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => handleDeleteClick(tier)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Sitter Tiers"
        description="Manage sitter performance tiers and requirements"
        actions={
          <>
            <Button variant="secondary" onClick={calculateTiers} disabled={calculating} isLoading={calculating}>
              Calculate Tiers
            </Button>
            <Link href="/settings/tiers/new">
              <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
                Create Tier
              </Button>
            </Link>
          </>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Success Banner */}
        {successMessage && (
          <Card
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.success[50],
              borderColor: tokens.colors.success[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.success[700] }}>
              {successMessage}
            </div>
          </Card>
        )}

        {/* Error Banner */}
        {error && (
          <Card
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.error[50],
              borderColor: tokens.colors.error[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>{error}</div>
          </Card>
        )}

        {loading ? (
          <Card>
            <div style={{ padding: tokens.spacing[6] }}>
              <Skeleton height={400} />
            </div>
          </Card>
        ) : tiers.length === 0 ? (
          <EmptyState
            title="No Tiers Configured"
            description="Create your first sitter tier to get started"
            icon={<i className="fas fa-star" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: 'Create Tier',
              onClick: () => {
                window.location.href = '/settings/tiers/new';
              },
            }}
          />
        ) : (
          <Card>
            <Table columns={tableColumns} data={tiers} keyExtractor={(tier) => tier.id} />
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTierToDelete(null);
        }}
        title="Delete Tier"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.primary }}>
            Are you sure you want to delete <strong>{tierToDelete?.name}</strong>?
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            This action cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
            <Button
              variant="danger"
              onClick={deleteTier}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              variant="tertiary"
              onClick={() => {
                setDeleteModalOpen(false);
                setTierToDelete(null);
              }}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
