/**
 * Sitters List Page - System DNA Implementation
 * 
 * Configuration posture: Maximum stability, minimal motion, strong spatial separation.
 * Admin view for managing sitters (configuration, onboarding, permissions).
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  FormRow,
  Table,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  personalPhone?: string | null;
  openphonePhone?: string | null;
  phoneType?: 'personal' | 'openphone';
  email: string;
  isActive: boolean;
  commissionPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

const formatPhoneNumber = (phone: string | null | undefined) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

export default function SittersPage() {
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSitter, setEditingSitter] = useState<Sitter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sitterToDelete, setSitterToDelete] = useState<Sitter | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    personalPhone: '',
    openphonePhone: '',
    phoneType: 'personal' as 'personal' | 'openphone',
    email: '',
    isActive: true,
    commissionPercentage: 80.0,
  });

  useEffect(() => {
    fetchSitters();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchSitters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sitters');
      const data = await response.json();
      setSitters(data.sitters || []);
    } catch (err) {
      setError('Failed to load sitters');
      setSitters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = editingSitter ? `/api/sitters/${editingSitter.id}` : '/api/sitters';
      const method = editingSitter ? 'PATCH' : 'POST';

      let primaryPhone = formData.phone;
      if (formData.phoneType === 'personal' && formData.personalPhone) {
        primaryPhone = formData.personalPhone;
      } else if (formData.phoneType === 'openphone' && formData.openphonePhone) {
        primaryPhone = formData.openphonePhone;
      } else if (formData.personalPhone) {
        primaryPhone = formData.personalPhone;
      } else if (formData.openphonePhone) {
        primaryPhone = formData.openphonePhone;
      }

      const submitData = {
        ...formData,
        phone: primaryPhone,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setSuccessMessage(editingSitter ? 'Sitter updated!' : 'Sitter added!');
        resetForm();
        fetchSitters();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save sitter');
      }
    } catch (err) {
      setError('Failed to save sitter');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      personalPhone: '',
      commissionPercentage: 80.0,
      openphonePhone: '',
      phoneType: 'personal',
      email: '',
      isActive: true,
    });
    setShowAddForm(false);
    setEditingSitter(null);
    setError(null);
  };

  const startEdit = (sitter: Sitter) => {
    setFormData({
      firstName: sitter.firstName,
      lastName: sitter.lastName,
      phone: sitter.phone,
      personalPhone: sitter.personalPhone || '',
      openphonePhone: sitter.openphonePhone || '',
      phoneType: sitter.phoneType || 'personal',
      email: sitter.email,
      isActive: sitter.isActive,
      commissionPercentage: sitter.commissionPercentage || 80.0,
    });
    setEditingSitter(sitter);
    setShowAddForm(true);
  };

  const handleDeleteClick = (sitter: Sitter) => {
    setSitterToDelete(sitter);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!sitterToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/sitters/${sitterToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccessMessage('Sitter deleted!');
        setDeleteModalOpen(false);
        setSitterToDelete(null);
        fetchSitters();
      } else {
        setError('Failed to delete sitter');
      }
    } catch (err) {
      setError('Failed to delete sitter');
    } finally {
      setDeleting(false);
    }
  };

  const tableColumns: TableColumn<Sitter>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (sitter) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {sitter.firstName} {sitter.lastName}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (sitter) => <Badge variant={sitter.isActive ? 'success' : 'neutral'}>{sitter.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (sitter) => <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{sitter.email}</div>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (sitter) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          {formatPhoneNumber(sitter.phone)}
          {sitter.phoneType && (
            <Badge variant="info" style={{ marginLeft: tokens.spacing[2] }}>
              {sitter.phoneType === 'personal' ? 'Personal' : 'OpenPhone'}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'commission',
      header: 'Commission',
      render: (sitter) => <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{sitter.commissionPercentage || 80}%</div>,
    },
    {
      key: 'created',
      header: 'Added',
      render: (sitter) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
          {new Date(sitter.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (sitter) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => window.open(`/sitter-dashboard?id=${sitter.id}&admin=true`, '_blank')}
          >
            Dashboard
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => startEdit(sitter)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDeleteClick(sitter)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Sitters Management"
        description="Manage your pet care team"
        actions={
          <>
            <Button variant="primary" onClick={() => {
              resetForm();
              setShowAddForm(true);
            }} leftIcon={<i className="fas fa-plus" />}>
              Add Sitter
            </Button>
            <Link href="/bookings">
              <Button variant="tertiary" leftIcon={<i className="fas fa-arrow-left" />}>
                Back to Bookings
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

        {/* Sitters Table */}
        {loading ? (
          <Card depth="elevated">
            <div style={{ padding: tokens.spacing[6] }}>
              <Skeleton height={400} />
            </div>
          </Card>
        ) : sitters.length === 0 ? (
          <EmptyState
            title="No sitters found"
            description="Add your first sitter to get started"
            icon={<i className="fas fa-user-friends" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: 'Add Sitter',
              onClick: () => {
                resetForm();
                setShowAddForm(true);
              },
            }}
          />
        ) : (
          <Card depth="elevated">
            <Table columns={tableColumns} data={sitters} keyExtractor={(sitter) => sitter.id} />
          </Card>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={resetForm}
        title={editingSitter ? 'Edit Sitter' : 'Add Sitter'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
              <FormRow label="First Name" required>
                <Input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </FormRow>
              <FormRow label="Last Name" required>
                <Input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </FormRow>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
              <FormRow label="Personal Phone Number">
                <Input
                  type="tel"
                  value={formData.personalPhone}
                  onChange={(e) => setFormData({ ...formData, personalPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </FormRow>
              <FormRow label="OpenPhone Number">
                <Input
                  type="tel"
                  value={formData.openphonePhone}
                  onChange={(e) => setFormData({ ...formData, openphonePhone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </FormRow>
            </div>

            <FormRow label="Use Phone Number Type for Messages">
              <div style={{ display: 'flex', gap: tokens.spacing[4] }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="phoneType"
                    value="personal"
                    checked={formData.phoneType === 'personal'}
                    onChange={(e) => setFormData({ ...formData, phoneType: e.target.value as 'personal' | 'openphone' })}
                  />
                  <span style={{ fontSize: tokens.typography.fontSize.sm[0] }}>Personal Phone</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="phoneType"
                    value="openphone"
                    checked={formData.phoneType === 'openphone'}
                    onChange={(e) => setFormData({ ...formData, phoneType: e.target.value as 'personal' | 'openphone' })}
                  />
                  <span style={{ fontSize: tokens.typography.fontSize.sm[0] }}>OpenPhone</span>
                </label>
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                Choose which phone number to use for sitter notifications
              </div>
            </FormRow>

            <FormRow label="Email" required>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormRow>

            <FormRow label="Commission Percentage" required>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={formData.commissionPercentage}
                  onChange={(e) => setFormData({ ...formData, commissionPercentage: parseFloat(e.target.value) || 80.0 })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>%</span>
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                Percentage of booking total the sitter receives (typically 70% or 80%)
              </div>
            </FormRow>

            <FormRow>
              <label style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span style={{ fontSize: tokens.typography.fontSize.sm[0] }}>Active Sitter</span>
              </label>
            </FormRow>

            <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
              <Button variant="tertiary" type="button" onClick={resetForm}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingSitter ? 'Update' : 'Add'} Sitter
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSitterToDelete(null);
        }}
        title="Delete Sitter"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.primary }}>
            Are you sure you want to delete <strong>{sitterToDelete?.firstName} {sitterToDelete?.lastName}</strong>?
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            This action cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              variant="tertiary"
              onClick={() => {
                setDeleteModalOpen(false);
                setSitterToDelete(null);
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
