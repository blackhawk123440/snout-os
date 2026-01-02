/**
 * Form Builder Page - Enterprise Rebuild
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

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  visibleToSitter: boolean;
  visibleToClient: boolean;
  includeInReport: boolean;
}

export default function FormBuilderPage() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<FormField | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/form-fields');
      const data = await response.json();
      setFields((data.fields || []).sort((a: FormField, b: FormField) => a.order - b.order));
    } catch (err) {
      setError('Failed to load form fields');
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (field: FormField) => {
    setFieldToDelete(field);
    setDeleteModalOpen(true);
  };

  const deleteField = async () => {
    if (!fieldToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/form-fields/${fieldToDelete.id}`, {
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

  const tableColumns: TableColumn<FormField>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (field) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, fontWeight: tokens.typography.fontWeight.medium }}>
          #{field.order}
        </div>
      ),
      align: 'right',
    },
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
      key: 'visibility',
      header: 'Visibility',
      render: (field) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
          {field.visibleToSitter && <Badge variant="success">Sitter</Badge>}
          {field.visibleToClient && <Badge variant="info">Client</Badge>}
        </div>
      ),
    },
    {
      key: 'report',
      header: 'In Report',
      render: (field) => (field.includeInReport ? <Badge variant="info">Yes</Badge> : <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>—</span>),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (field) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
          <Link href={`/settings/form-builder/${field.id}`}>
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
        title="Form Builder"
        description="Customize your booking form fields"
        actions={
          <Link href="/settings/form-builder/new">
            <Button variant="primary" energy="active" leftIcon={<i className="fas fa-plus" />}>
              Add Field
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
        ) : fields.length === 0 ? (
          <EmptyState
            title="No Form Fields"
            description="Create your first form field to get started"
            icon={<i className="fas fa-file-alt" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: 'Add Field',
              onClick: () => {
                window.location.href = '/settings/form-builder/new';
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
        title="Delete Form Field"
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
