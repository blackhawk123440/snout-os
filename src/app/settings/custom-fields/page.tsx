/**
 * Custom Fields Page - Enterprise Rebuild
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
  Select,
  Table,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';

interface CustomField {
  id: string;
  label: string;
  type: string;
  entityType: string;
  required: boolean;
  visibleToOwner: boolean;
  visibleToSitter: boolean;
  visibleToClient: boolean;
  editableBySitter: boolean;
  editableByClient: boolean;
  showInTemplates: boolean;
}

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entityType: '' });
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFields();
  }, [filter]);

  const fetchFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter.entityType) params.append('entityType', filter.entityType);

      const response = await fetch(`/api/custom-fields?${params}`);
      const data = await response.json();
      setFields(data.fields || []);
    } catch (err) {
      setError('Failed to load custom fields');
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (field: CustomField) => {
    setFieldToDelete(field);
    setDeleteModalOpen(true);
  };

  const deleteField = async () => {
    if (!fieldToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/custom-fields/${fieldToDelete.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDeleteModalOpen(false);
        setFieldToDelete(null);
        fetchFields();
      } else {
        setError('Failed to delete field');
      }
    } catch (err) {
      setError('Failed to delete field');
    } finally {
      setDeleting(false);
    }
  };

  const entityTypeOptions = [
    { value: '', label: 'All Entity Types' },
    { value: 'client', label: 'Client' },
    { value: 'pet', label: 'Pet' },
    { value: 'sitter', label: 'Sitter' },
    { value: 'booking', label: 'Booking' },
  ];

  const tableColumns: TableColumn<CustomField>[] = [
    {
      key: 'label',
      header: 'Label',
      render: (field) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {field.label}
          {field.required && <Badge variant="error" style={{ marginLeft: tokens.spacing[2] }}>Required</Badge>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (field) => <Badge variant="info">{field.type}</Badge>,
    },
    {
      key: 'entityType',
      header: 'Entity',
      render: (field) => <Badge variant="info">{field.entityType}</Badge>,
    },
    {
      key: 'visibility',
      header: 'Visibility',
      render: (field) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
          {field.visibleToOwner && <Badge variant="neutral">Owner</Badge>}
          {field.visibleToSitter && <Badge variant="success">Sitter</Badge>}
          {field.visibleToClient && <Badge variant="info">Client</Badge>}
        </div>
      ),
    },
    {
      key: 'editable',
      header: 'Editable By',
      render: (field) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
          {field.editableBySitter && <Badge variant="warning">Sitter</Badge>}
          {field.editableByClient && <Badge variant="warning">Client</Badge>}
          {!field.editableBySitter && !field.editableByClient && (
            <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>—</span>
          )}
        </div>
      ),
    },
    {
      key: 'templates',
      header: 'Templates',
      render: (field) => (field.showInTemplates ? <Badge variant="info">Yes</Badge> : <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>—</span>),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (field) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
          <Link href={`/settings/custom-fields/${field.id}`}>
            <Button variant="tertiary" size="sm">
              Edit
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => handleDeleteClick(field)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Custom Fields"
        description="Manage custom fields for clients, pets, sitters, and bookings"
        actions={
          <Link href="/settings/custom-fields/new">
            <Button variant="primary" energy="active" leftIcon={<i className="fas fa-plus" />}>
              Create Field
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

        {/* Filters */}
        <Card depth="elevated" style={{ marginBottom: tokens.spacing[6] }}>
          <div style={{ display: 'flex', gap: tokens.spacing[4], alignItems: 'center' }}>
            <div style={{ minWidth: '200px' }}>
              <Select
                value={filter.entityType}
                onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
                options={entityTypeOptions}
              />
            </div>
          </div>
        </Card>

        {loading ? (
          <Card depth="elevated">
            <div style={{ padding: tokens.spacing[6] }}>
              <Skeleton height={400} />
            </div>
          </Card>
        ) : fields.length === 0 ? (
          <EmptyState
            title="No Custom Fields"
            description="Create your first custom field to get started"
            icon={<i className="fas fa-tags" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: 'Create Field',
              onClick: () => {
                window.location.href = '/settings/custom-fields/new';
              },
            }}
          />
        ) : (
          <Card depth="elevated">
            <Table columns={tableColumns} data={fields} keyExtractor={(field) => field.id} />
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setFieldToDelete(null);
        }}
        title="Delete Custom Field"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.primary }}>
            Are you sure you want to delete <strong>{fieldToDelete?.label}</strong>?
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            This action cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
            <Button
              variant="danger"
              onClick={deleteField}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              variant="tertiary"
              onClick={() => {
                setDeleteModalOpen(false);
                setFieldToDelete(null);
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
