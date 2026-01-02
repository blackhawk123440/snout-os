/**
 * Pricing Settings Page - Enterprise Rebuild
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

interface PricingRule {
  id: string;
  name: string;
  type: string;
  value: number;
  conditions: string;
  enabled: boolean;
}

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<PricingRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pricing-rules');
      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      setError('Failed to load pricing rules');
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/pricing-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      setError('Failed to toggle rule');
    }
  };

  const handleDeleteClick = (rule: PricingRule) => {
    setRuleToDelete(rule);
    setDeleteModalOpen(true);
  };

  const deleteRule = async () => {
    if (!ruleToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/pricing-rules/${ruleToDelete.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDeleteModalOpen(false);
        setRuleToDelete(null);
        fetchRules();
      } else {
        setError('Failed to delete rule');
      }
    } catch (error) {
      setError('Failed to delete rule');
    } finally {
      setDeleting(false);
    }
  };

  const tableColumns: TableColumn<PricingRule>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (rule) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {rule.name}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (rule) => <Badge variant="info">{rule.type}</Badge>,
    },
    {
      key: 'value',
      header: 'Value',
      render: (rule) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{rule.value}</div>
      ),
    },
    {
      key: 'conditions',
      header: 'Conditions',
      render: (rule) => {
        try {
          const conditions = rule.conditions ? JSON.parse(rule.conditions) : {};
          return (
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
              {Object.keys(conditions).length > 0 ? JSON.stringify(conditions) : '—'}
            </div>
          );
        } catch {
          return <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>—</div>;
        }
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (rule) => <Badge variant={rule.enabled ? 'success' : 'neutral'}>{rule.enabled ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (rule) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
          <Button
            variant={rule.enabled ? 'tertiary' : 'primary'}
            size="sm"
            onClick={() => toggleRule(rule.id, rule.enabled)}
          >
            {rule.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Link href={`/settings/pricing/${rule.id}`}>
            <Button variant="tertiary" size="sm">
              Edit
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => handleDeleteClick(rule)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Pricing Rules"
        description="Manage dynamic pricing rules and fees"
        actions={
          <Link href="/settings/pricing/new">
            <Button variant="primary" energy="active" leftIcon={<i className="fas fa-plus" />}>
              Create Rule
            </Button>
          </Link>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Error Banner */}
        {error && (
          <Card
            depth="critical"
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
          <Card depth="elevated">
            <div style={{ padding: tokens.spacing[6] }}>
              <Skeleton height={400} />
            </div>
          </Card>
        ) : rules.length === 0 ? (
          <EmptyState
            title="No Pricing Rules"
            description="Create your first pricing rule to get started"
            icon={<i className="fas fa-dollar-sign" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: 'Create Rule',
              onClick: () => {
                window.location.href = '/settings/pricing/new';
              },
            }}
          />
        ) : (
          <Card depth="elevated">
            <Table columns={tableColumns} data={rules} keyExtractor={(rule) => rule.id} />
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRuleToDelete(null);
        }}
        title="Delete Pricing Rule"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.primary }}>
            Are you sure you want to delete <strong>{ruleToDelete?.name}</strong>?
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            This action cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
            <Button
              variant="danger"
              onClick={deleteRule}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              variant="tertiary"
              onClick={() => {
                setDeleteModalOpen(false);
                setRuleToDelete(null);
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
