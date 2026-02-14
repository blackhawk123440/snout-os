/**
 * Sitters Management Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Modal,
  Badge,
  EmptyState,
  Skeleton,
  FormRow,
  Table,
  TableColumn,
  MobileFilterBar,
  Select,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { SitterTierBadge } from '@/components/sitter';

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  personalPhone?: string | null;
  email: string;
  isActive: boolean;
  commissionPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
  currentTier?: {
    id: string;
    name: string;
    priorityLevel: number;
  } | null;
}

export default function SittersPage() {
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSitter, setEditingSitter] = useState<Sitter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'tier' | 'created'>('name');
  const isMobile = useMobile();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    personalPhone: "",
    email: "",
    isActive: true,
    commissionPercentage: 80.0,
  });

  const [tiers, setTiers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchSitters();
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const response = await fetch("/api/sitter-tiers");
      if (response.ok) {
        const data = await response.json();
        setTiers(data.tiers || []);
      }
    } catch (err) {
      console.error('Failed to fetch tiers:', err);
    }
  };

  const fetchSitters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sitters");
      if (!response.ok) {
        throw new Error('Failed to fetch sitters');
      }
      const data = await response.json();
      // Ensure sitters include tier information
      const sittersWithTiers = (data.sitters || []).map((sitter: any) => ({
        ...sitter,
        isActive: sitter.active !== false,
        currentTier: sitter.currentTier || null,
      }));
      setSitters(sittersWithTiers);
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
      const url = editingSitter ? `/api/sitters/${editingSitter.id}` : "/api/sitters";
      const method = editingSitter ? "PATCH" : "POST";

      // Use personal phone if provided, otherwise use main phone
      let primaryPhone = formData.phone;
      if (formData.personalPhone) {
        primaryPhone = formData.personalPhone;
      }

      const submitData = {
        ...formData,
        phone: primaryPhone,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert(editingSitter ? "Sitter updated!" : "Sitter added!");
        resetForm();
        fetchSitters();
      } else {
        setError('Failed to save sitter');
      }
    } catch (err) {
      setError('Failed to save sitter');
    }
  };

  const resetForm = () => {
    setFormData({ 
      firstName: "", 
      lastName: "", 
      phone: "", 
      personalPhone: "",
      commissionPercentage: 80.0,
      email: "", 
      isActive: true 
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
      personalPhone: sitter.personalPhone || "",
      email: sitter.email,
      isActive: sitter.isActive,
      commissionPercentage: sitter.commissionPercentage || 80.0,
    });
    setEditingSitter(sitter);
    setShowAddForm(true);
  };

  const handleDelete = async (sitterId: string) => {
    if (!confirm("Are you sure you want to delete this sitter?")) return;

    try {
      const response = await fetch(`/api/sitters/${sitterId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Sitter deleted!");
        fetchSitters();
      } else {
        setError('Failed to delete sitter');
      }
    } catch (err) {
      setError('Failed to delete sitter');
    }
  };

  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const filteredAndSortedSitters = useMemo(() => {
    let filtered = sitters;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.firstName.toLowerCase().includes(term) ||
          s.lastName.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          s.phone.includes(term)
      );
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(
        (s) => s.currentTier?.id === tierFilter
      );
    }

    // Active filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(
        (s) => (activeFilter === 'active') === s.isActive
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      } else if (sortBy === 'tier') {
        const aTier = a.currentTier?.priorityLevel ?? 0;
        const bTier = b.currentTier?.priorityLevel ?? 0;
        return bTier - aTier;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [sitters, searchTerm, tierFilter, activeFilter, sortBy]);

  const sitterColumns: TableColumn<Sitter>[] = [
    {
      key: 'name',
      header: 'Sitter',
      mobileLabel: 'Sitter',
      mobileOrder: 1,
      render: (row) => (
        <div>
          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
            {row.firstName} {row.lastName}
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}
          >
            {row.email}
          </div>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      mobileLabel: 'Tier',
      mobileOrder: 2,
      render: (row) => (
        row.currentTier ? (
          <SitterTierBadge tier={row.currentTier} />
        ) : (
          <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            No tier
          </span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      mobileOrder: 3,
      render: (row) => (
        <Badge variant={row.isActive ? "success" : "error"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      align: 'center',
    },
    {
      key: 'commission',
      header: 'Commission',
      mobileLabel: 'Commission',
      mobileOrder: 4,
      render: (row) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {row.commissionPercentage || 80}%
        </div>
      ),
      align: 'right',
    },
    {
      key: 'contact',
      header: 'Contact',
      mobileLabel: 'Phone',
      mobileOrder: 5,
      render: (row) => (
        <div
          style={{
            fontSize: tokens.typography.fontSize.sm[0],
            color: tokens.colors.text.secondary,
          }}
        >
          {formatPhoneNumber(row.phone)}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Sitters Management"
        description="Manage your pet care team"
        actions={
          !isMobile ? undefined : (
            <>
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                leftIcon={<i className="fas fa-plus" />}
              >
                Add Sitter
              </Button>
              <Link href="/bookings">
                <Button variant="tertiary" leftIcon={<i className="fas fa-arrow-left" />}>
                  Back to Bookings
                </Button>
              </Link>
            </>
          )
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {error && (
          <Card
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.error[50],
              borderColor: tokens.colors.error[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>
              {error}
              <Button
                variant="tertiary"
                size="sm"
                onClick={fetchSitters}
                style={{ marginLeft: tokens.spacing[3] }}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Filters */}
        {isMobile ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: tokens.spacing[4], paddingLeft: tokens.spacing[4], paddingRight: tokens.spacing[4] }}>
              <div style={{ width: '100%', maxWidth: '100%' }}>
                <Card style={{ padding: tokens.spacing[4], marginBottom: tokens.spacing[4] }}>
                  <MobileFilterBar
                    activeFilter={sortBy}
                    onFilterChange={(filterId) => setSortBy(filterId as any)}
                    sticky={false}
                    options={[
                      { id: 'name', label: 'Name' },
                      { id: 'tier', label: 'Tier' },
                      { id: 'created', label: 'Newest' },
                    ]}
                  />
                </Card>
              </div>
            </div>
            <Card style={{ marginBottom: tokens.spacing[4], marginTop: tokens.spacing[4] }}>
              <Input
                placeholder="Search sitters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<i className="fas fa-search" />}
              />
            </Card>
            <Card style={{ marginBottom: tokens.spacing[4] }}>
              <Select
                label="Tier"
                options={[
                  { value: 'all', label: 'All Tiers' },
                  ...tiers.map(t => ({ value: t.id, label: t.name })),
                ]}
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
              />
              <div style={{ marginTop: tokens.spacing[3] }}>
                <Select
                  label="Status"
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                />
              </div>
            </Card>
          </>
        ) : (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: tokens.zIndex.sticky,
              backgroundColor: tokens.colors.background.primary,
              marginBottom: tokens.spacing[4],
            }}
          >
            <Card>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto auto',
                  gap: tokens.spacing[4],
                  alignItems: 'end',
                }}
              >
                <Input
                  placeholder="Search sitters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<i className="fas fa-search" />}
                />
                <Select
                  label="Tier"
                  options={[
                    { value: 'all', label: 'All Tiers' },
                    ...tiers.map(t => ({ value: t.id, label: t.name })),
                  ]}
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                />
                <Select
                  label="Status"
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                />
                <Select
                  label="Sort"
                  options={[
                    { value: 'name', label: 'Name' },
                    { value: 'tier', label: 'Tier' },
                    { value: 'created', label: 'Newest' },
                  ]}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    resetForm();
                    setShowAddForm(true);
                  }}
                  leftIcon={<i className="fas fa-plus" />}
                >
                  Add Sitter
                </Button>
              </div>
            </Card>
          </div>
        )}

        {loading ? (
          <Card padding={false}>
            <Skeleton height="400px" />
          </Card>
        ) : filteredAndSortedSitters.length === 0 ? (
          <EmptyState
            title="No sitters found"
            description={sitters.length === 0 ? "Add your first sitter to get started" : "No sitters match your filters"}
            icon={<i className="fas fa-user-friends" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={
              sitters.length === 0 ? {
                label: "Add Sitter",
                onClick: () => {
                  resetForm();
                  setShowAddForm(true);
                },
              } : undefined
            }
          />
        ) : isMobile ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: tokens.spacing[4], // Increased gap for bigger containers
          }}>
            {filteredAndSortedSitters.map((sitter) => (
              <Card 
                key={sitter.id}
                style={{
                  padding: tokens.spacing[6], // Increased padding for bigger containers
                }}
              >
                {/* Name/Tier Container - Centered */}
                <Card style={{ 
                  padding: tokens.spacing[4], 
                  marginBottom: tokens.spacing[4],
                  backgroundColor: tokens.colors.background.secondary,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: tokens.spacing[3], 
                    marginBottom: tokens.spacing[2],
                  }}>
                    <div
                      style={{
                        width: '48px', // Made bigger
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: tokens.colors.primary[100],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: tokens.colors.primary.DEFAULT,
                        fontSize: tokens.typography.fontSize.lg[0], // Made bigger
                        flexShrink: 0,
                      }}
                    >
                      <i className="fas fa-user" />
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: tokens.typography.fontWeight.bold,
                          fontSize: tokens.typography.fontSize.xl[0], // Made bigger
                          color: tokens.colors.text.primary,
                          marginBottom: tokens.spacing[1],
                          wordBreak: 'break-word',
                        }}
                      >
                        {sitter.firstName} {sitter.lastName}
                      </div>
                      <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                        <Badge variant={sitter.isActive ? "success" : "error"}>
                          {sitter.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {sitter.currentTier && (
                          <SitterTierBadge tier={sitter.currentTier} />
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Contact Info - Made larger */}
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.base[0], // Made bigger from xs/sm
                    color: tokens.colors.text.secondary,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: tokens.spacing[3], // Increased gap
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                    <i className="fas fa-phone" style={{ width: '20px', fontSize: tokens.typography.fontSize.base[0] }} />
                    <span style={{ fontSize: tokens.typography.fontSize.base[0] }}>{formatPhoneNumber(sitter.phone)}</span>
                  </div>
                  {sitter.personalPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                      <i className="fas fa-mobile-alt" style={{ width: '20px', fontSize: tokens.typography.fontSize.base[0] }} />
                      <span style={{ fontSize: tokens.typography.fontSize.base[0] }}>Personal: {formatPhoneNumber(sitter.personalPhone)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                    <i className="fas fa-envelope" style={{ width: '20px', fontSize: tokens.typography.fontSize.base[0] }} />
                    <span style={{ fontSize: tokens.typography.fontSize.base[0] }}>{sitter.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                    <i className="fas fa-calendar" style={{ width: '20px', fontSize: tokens.typography.fontSize.base[0] }} />
                    <span style={{ fontSize: tokens.typography.fontSize.base[0] }}>Added {new Date(sitter.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                    <i className="fas fa-percentage" style={{ width: '20px', fontSize: tokens.typography.fontSize.base[0] }} />
                    <span style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>Commission: {sitter.commissionPercentage || 80}%</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: tokens.spacing[3], 
                  marginTop: tokens.spacing[4],
                }}>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => window.open(`/sitter-dashboard?id=${sitter.id}&admin=true`, '_blank')}
                      leftIcon={<i className="fas fa-calendar-alt" />}
                      style={{ width: '100%' }}
                    >
                      View Dashboard
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => startEdit(sitter)}
                      leftIcon={<i className="fas fa-edit" />}
                      style={{ width: '100%' }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => handleDelete(sitter.id)}
                      leftIcon={<i className="fas fa-trash" />}
                      style={{ width: '100%' }}
                    >
                      Delete
                    </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card padding={!loading}>
            <Table
              columns={sitterColumns}
              data={filteredAndSortedSitters}
              emptyMessage="No sitters found. Add your first sitter to get started."
              onRowClick={(row) => {
                window.location.href = `/sitters/${row.id}`;
              }}
              keyExtractor={(row) => row.id}
            />
          </Card>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={resetForm}
        title={editingSitter ? "Edit Sitter" : "Add Sitter"}
        size={isMobile ? "full" : "md"}
      >
        {error && (
          <div
            style={{
              padding: tokens.spacing[3],
              marginBottom: tokens.spacing[4],
              backgroundColor: tokens.colors.error[50],
              borderRadius: tokens.borderRadius.md,
              color: tokens.colors.error[700],
              fontSize: tokens.typography.fontSize.sm[0],
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
              <FormRow label="First Name *">
                <Input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </FormRow>
              <FormRow label="Last Name *">
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
              </div>
              
            <FormRow label="Masking Number">
              <div style={{
                padding: tokens.spacing[3],
                backgroundColor: tokens.colors.neutral[50],
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.border.default}`,
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
              }}>
                <i className="fas fa-info-circle" style={{ marginRight: tokens.spacing[2] }} />
                Masking numbers are assigned automatically by the system when a sitter is assigned to a booking.
                View assigned numbers in <Link href="/messages?tab=numbers" style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'underline' }}>Messages → Numbers</Link>.
              </div>
            </FormRow>

            <FormRow label="Email *">
              <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormRow>

            <FormRow label="Commission Percentage *">
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
                <span style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.text.primary }}>
                  %
                </span>
                </div>
              <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1] }}>
                Percentage of booking total the sitter receives (typically 70% or 80%)
              </div>
            </FormRow>

            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ accentColor: tokens.colors.primary.DEFAULT }}
                />
              <label htmlFor="isActive" style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.text.primary, cursor: 'pointer' }}>
                  Active Sitter
                </label>
              </div>
              
            <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4] }}>
              <Button
                  type="submit"
                variant="primary"
                style={{ flex: 1 }}
                >
                  {editingSitter ? "Update" : "Add"} Sitter
              </Button>
              <Button
                  type="button"
                  onClick={resetForm}
                variant="tertiary"
                style={{ flex: 1 }}
                >
                  Cancel
              </Button>
              </div>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
