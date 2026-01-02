/**
 * Services Settings Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
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

interface ServiceConfig {
  id: string;
  serviceName: string;
  basePrice: number;
  defaultVisitLength: number;
  category: string;
  minBookingNotice: number;
  gpsCheckInRequired: boolean;
  photosRequired: boolean;
  weekendMultiplier: number;
  config: string;
}

export default function ServiceSettingsPage() {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/service-configs');
      const data = await response.json();
      setServices(data.configs || []);
    } catch (err) {
      setError('Failed to load services');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (service: ServiceConfig) => {
    setServiceToDelete(service);
    setDeleteModalOpen(true);
  };

  const deleteService = async () => {
    if (!serviceToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/service-configs/${serviceToDelete.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDeleteModalOpen(false);
        setServiceToDelete(null);
        fetchServices();
      } else {
        setError('Failed to delete service');
      }
    } catch (err) {
      setError('Failed to delete service');
    } finally {
      setDeleting(false);
    }
  };

  const tableColumns: TableColumn<ServiceConfig>[] = [
    {
      key: 'name',
      header: 'Service Name',
      render: (service) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {service.serviceName}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (service) => <Badge variant="info">{service.category}</Badge>,
    },
    {
      key: 'basePrice',
      header: 'Base Price',
      render: (service) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          ${service.basePrice.toFixed(2)}
        </div>
      ),
      align: 'right',
    },
    {
      key: 'length',
      header: 'Default Length',
      render: (service) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          {service.defaultVisitLength} min
        </div>
      ),
    },
    {
      key: 'multiplier',
      header: 'Weekend',
      render: (service) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          {service.weekendMultiplier}x
        </div>
      ),
    },
    {
      key: 'requirements',
      header: 'Requirements',
      render: (service) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
          {service.gpsCheckInRequired && <Badge variant="info">GPS Required</Badge>}
          {service.photosRequired && <Badge variant="success">Photos Required</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (service) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
          <Button variant="tertiary" size="sm" onClick={() => setEditingService(service)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDeleteClick(service)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Service Settings"
        description="Configure all service types and rules"
        actions={
          <Button variant="primary" onClick={() => setShowCreateModal(true)} leftIcon={<i className="fas fa-plus" />}>
            Add Service
          </Button>
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
        ) : services.length === 0 ? (
          <EmptyState
            title="No Services Configured"
            description="Create your first service configuration to get started"
            icon={<i className="fas fa-cog" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: 'Add Service',
              onClick: () => setShowCreateModal(true),
            }}
          />
        ) : (
          <Card>
            <Table columns={tableColumns} data={services} keyExtractor={(service) => service.id} />
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setServiceToDelete(null);
        }}
        title="Delete Service"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.primary }}>
            Are you sure you want to delete <strong>{serviceToDelete?.serviceName}</strong>?
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            This action cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
            <Button
              variant="danger"
              onClick={deleteService}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              variant="tertiary"
              onClick={() => {
                setDeleteModalOpen(false);
                setServiceToDelete(null);
              }}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit Modal - Placeholder (not implemented in legacy) */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingService(null);
          }}
          title={editingService ? 'Edit Service' : 'Add Service'}
          size="lg"
        >
          <div style={{ padding: tokens.spacing[4], textAlign: 'center', color: tokens.colors.text.secondary }}>
            Service create/edit form not yet implemented. Navigate to detail page.
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
