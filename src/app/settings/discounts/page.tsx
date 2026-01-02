/**
 * Discounts Page - Enterprise Rebuild
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

interface Discount {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  valueType: string;
  usageLimit: number | null;
  usageCount: number;
  enabled: boolean;
  validFrom: string | null;
  validUntil: string | null;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/discounts');
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (err) {
      setError('Failed to load discounts');
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscount = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/discounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        fetchDiscounts();
      }
    } catch (error) {
      setError('Failed to toggle discount');
    }
  };

  const handleDeleteClick = (discount: Discount) => {
    setDiscountToDelete(discount);
    setDeleteModalOpen(true);
  };

  const deleteDiscount = async () => {
    if (!discountToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/discounts/${discountToDelete.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDeleteModalOpen(false);
        setDiscountToDelete(null);
        fetchDiscounts();
      } else {
        setError('Failed to delete discount');
      }
    } catch (err) {
      setError('Failed to delete discount');
    } finally {
      setDeleting(false);
    }
  };

  const tableColumns: TableColumn<Discount>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (discount) => (
        <div style={{ fontFamily: tokens.typography.fontFamily.mono.join(', '), fontWeight: tokens.typography.fontWeight.medium }}>
          {discount.code}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (discount) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {discount.name}
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (discount) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          {discount.valueType === 'percentage' ? `${discount.value}%` : `$${discount.value.toFixed(2)}`}
        </div>
      ),
      align: 'right',
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (discount) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
          {discount.usageCount} {discount.usageLimit ? `/ ${discount.usageLimit}` : ''}
        </div>
      ),
    },
    {
      key: 'valid',
      header: 'Valid',
      render: (discount) => {
        if (!discount.validFrom && !discount.validUntil) return <div>Always</div>;
        const from = discount.validFrom ? new Date(discount.validFrom).toLocaleDateString() : '';
        const until = discount.validUntil ? new Date(discount.validUntil).toLocaleDateString() : '';
        return (
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            {from && until ? `${from} - ${until}` : from || until}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (discount) => <Badge variant={discount.enabled ? 'success' : 'neutral'}>{discount.enabled ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (discount) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
          <Button
            variant={discount.enabled ? 'tertiary' : 'primary'}
            size="sm"
            onClick={() => toggleDiscount(discount.id, discount.enabled)}
          >
            {discount.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Link href={`/settings/discounts/${discount.id}`}>
            <Button variant="tertiary" size="sm">
              Edit
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => handleDeleteClick(discount)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Discounts"
        description="Manage discount codes and automatic discounts"
        actions={
          <Link href="/settings/discounts/new">
            <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
              Create Discount
            </Button>
          </Link>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
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
        ) : discounts.length === 0 ? (
          <EmptyState
            title="No Discounts"
            description="Create your first discount code to get started"
            icon={<i className="fas fa-tag" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: 'Create Discount',
              onClick: () => {
                window.location.href = '/settings/discounts/new';
              },
            }}
          />
        ) : (
          <Card>
            <Table columns={tableColumns} data={discounts} keyExtractor={(discount) => discount.id} />
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDiscountToDelete(null);
        }}
        title="Delete Discount"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.primary }}>
            Are you sure you want to delete <strong>{discountToDelete?.name}</strong> ({discountToDelete?.code})?
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            This action cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
            <Button
              variant="danger"
              onClick={deleteDiscount}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              variant="tertiary"
              onClick={() => {
                setDeleteModalOpen(false);
                setDiscountToDelete(null);
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
