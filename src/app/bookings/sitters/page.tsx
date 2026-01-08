/**
 * Sitters Management Page - Enterprise Rebuild
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
  Input,
  Modal,
  Badge,
  EmptyState,
  Skeleton,
  FormRow,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  personalPhone?: string | null;
  openphonePhone?: string | null;
  phoneType?: "personal" | "openphone";
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    personalPhone: "",
    openphonePhone: "",
    phoneType: "personal" as "personal" | "openphone",
    email: "",
    isActive: true,
    commissionPercentage: 80.0,
  });

  useEffect(() => {
    fetchSitters();
  }, []);

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

      // Determine primary phone based on phoneType
      let primaryPhone = formData.phone;
      if (formData.phoneType === "personal" && formData.personalPhone) {
        primaryPhone = formData.personalPhone;
      } else if (formData.phoneType === "openphone" && formData.openphonePhone) {
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
      openphonePhone: "",
      phoneType: "personal",
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
      openphonePhone: sitter.openphonePhone || "",
      phoneType: sitter.phoneType || "personal",
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

  return (
    <AppShell>
      <PageHeader
        title="Sitters Management"
        description="Manage your pet care team"
        actions={
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

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <Skeleton height={150} />
            <Skeleton height={150} />
            <Skeleton height={150} />
            </div>
          ) : sitters.length === 0 ? (
          <EmptyState
            title="No sitters found"
            description="Add your first sitter to get started"
            icon={<i className="fas fa-user-friends" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: "Add Sitter",
              onClick: () => {
                resetForm();
                setShowAddForm(true);
              },
            }}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? tokens.spacing[3] : tokens.spacing[4],
          }}>
            {sitters.map((sitter) => (
              <Card 
                key={sitter.id}
                style={{
                  padding: isMobile ? tokens.spacing[3] : undefined,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'flex-start',
                    justifyContent: 'space-between',
                    gap: isMobile ? tokens.spacing[3] : tokens.spacing[4],
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: isMobile ? tokens.spacing[2] : tokens.spacing[3], 
                      marginBottom: isMobile ? tokens.spacing[2] : tokens.spacing[3],
                      flexWrap: isMobile ? 'wrap' : 'nowrap',
                    }}>
                      <div
                        style={{
                          width: isMobile ? '40px' : '48px',
                          height: isMobile ? '40px' : '48px',
                          borderRadius: '50%',
                          backgroundColor: tokens.colors.primary[100],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: tokens.colors.primary.DEFAULT,
                          fontSize: isMobile ? tokens.typography.fontSize.base[0] : tokens.typography.fontSize.xl[0],
                          flexShrink: 0,
                        }}
                      >
                        <i className="fas fa-user" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: tokens.typography.fontWeight.bold,
                            fontSize: isMobile ? tokens.typography.fontSize.base[0] : tokens.typography.fontSize.lg[0],
                            color: tokens.colors.text.primary,
                            marginBottom: tokens.spacing[1],
                            wordBreak: 'break-word',
                          }}
                        >
                          {sitter.firstName} {sitter.lastName}
                        </div>
                        <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap', alignItems: 'center' }}>
                          <Badge variant={sitter.isActive ? "success" : "error"}>
                          {sitter.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {sitter.currentTier && (
                            <Badge variant="default" style={{ backgroundColor: tokens.colors.primary[100], color: tokens.colors.primary.DEFAULT }}>
                              <i className="fas fa-star" style={{ marginRight: tokens.spacing[1] }} />
                              {sitter.currentTier.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div
                      style={{
                        fontSize: isMobile ? tokens.typography.fontSize.xs[0] : tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: tokens.spacing[1],
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                        <i className="fas fa-phone" style={{ width: '16px' }} />
                        <span>{formatPhoneNumber(sitter.phone)}</span>
                        {sitter.phoneType && (
                          <Badge variant="neutral" style={{ marginLeft: tokens.spacing[1] }}>
                            {sitter.phoneType === "personal" ? "Personal" : "OpenPhone"}
                          </Badge>
                        )}
                      </div>
                      {sitter.personalPhone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                          <i className="fas fa-mobile-alt" style={{ width: '16px' }} />
                          <span>Personal: {formatPhoneNumber(sitter.personalPhone)}</span>
                        </div>
                      )}
                      {sitter.openphonePhone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                          <i className="fas fa-phone-alt" style={{ width: '16px' }} />
                          <span>OpenPhone: {formatPhoneNumber(sitter.openphonePhone)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                        <i className="fas fa-envelope" style={{ width: '16px' }} />
                        <span>{sitter.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                        <i className="fas fa-calendar" style={{ width: '16px' }} />
                        <span>Added {new Date(sitter.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                        <i className="fas fa-percentage" style={{ width: '16px' }} />
                        <span>Commission: {sitter.commissionPercentage || 80}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: tokens.spacing[2], 
                    alignItems: 'center',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                  }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(`/sitter-dashboard?id=${sitter.id}&admin=true`, '_blank')}
                      leftIcon={<i className="fas fa-calendar-alt" />}
                      style={{ width: isMobile ? '100%' : 'auto' }}
                    >
                      View Dashboard
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => startEdit(sitter)}
                      leftIcon={<i className="fas fa-edit" />}
                      style={{ flex: isMobile ? 1 : 'none' }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(sitter.id)}
                      leftIcon={<i className="fas fa-trash" />}
                      style={{ flex: isMobile ? 1 : 'none' }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
              </div>
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
                    checked={formData.phoneType === "personal"}
                    onChange={(e) => setFormData({ ...formData, phoneType: e.target.value as "personal" | "openphone" })}
                    style={{ accentColor: tokens.colors.primary.DEFAULT }}
                  />
                  <span style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.text.primary }}>
                    Personal Phone
                  </span>
                  </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="phoneType"
                    value="openphone"
                    checked={formData.phoneType === "openphone"}
                    onChange={(e) => setFormData({ ...formData, phoneType: e.target.value as "personal" | "openphone" })}
                    style={{ accentColor: tokens.colors.primary.DEFAULT }}
                  />
                  <span style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.text.primary }}>
                    OpenPhone
                  </span>
                </label>
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1] }}>
                Choose which phone number to use for sitter notifications
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
