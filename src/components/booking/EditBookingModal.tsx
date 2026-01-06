/**
 * Edit Booking Modal
 * 
 * Enterprise booking editor that reuses existing form validation and mapping logic.
 * Shows diff review for high-risk changes.
 * Mobile: Full-height bottom sheet
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { Button, Input, Select, Textarea, Badge } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { validateFormPayload, VALID_SERVICES } from '@/lib/validation/form-booking';
import type { BookingEditInput } from '@/lib/booking-edit-service';

interface Pet {
  id?: string;
  name: string;
  species: string;
  breed?: string | null;
  age?: number | null;
  notes?: string | null;
}

interface TimeSlot {
  id?: string;
  startAt: Date | string;
  endAt: Date | string;
  duration: number;
}

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  quantity: number;
  afterHours: boolean;
  holiday: boolean;
  notes?: string | null;
  pets: Pet[];
  timeSlots: TimeSlot[];
}

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onSave: (updates: BookingEditInput) => Promise<{ success: boolean; error?: string; changes?: any }>;
}

interface DiffReview {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSave,
}) => {
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [diffReview, setDiffReview] = useState<DiffReview[]>([]);

  // Form state
  const [formData, setFormData] = useState<BookingEditInput>({
    firstName: booking.firstName,
    lastName: booking.lastName,
    phone: booking.phone,
    email: booking.email,
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    address: booking.address,
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    quantity: booking.quantity,
    afterHours: booking.afterHours,
    holiday: booking.holiday,
    notes: booking.notes,
    pets: booking.pets.map(p => ({
      id: p.id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      age: p.age,
      notes: p.notes,
    })),
    timeSlots: booking.timeSlots.map(ts => ({
      id: ts.id,
      startAt: ts.startAt,
      endAt: ts.endAt,
      duration: ts.duration,
    })),
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        firstName: booking.firstName,
        lastName: booking.lastName,
        phone: booking.phone,
        email: booking.email,
        service: booking.service,
        startAt: booking.startAt,
        endAt: booking.endAt,
        address: booking.address,
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        quantity: booking.quantity,
        afterHours: booking.afterHours,
        holiday: booking.holiday,
        notes: booking.notes,
        pets: booking.pets.map(p => ({
          id: p.id,
          name: p.name,
          species: p.species,
          breed: p.breed,
          age: p.age,
          notes: p.notes,
        })),
        timeSlots: booking.timeSlots.map(ts => ({
          id: ts.id,
          startAt: ts.startAt,
          endAt: ts.endAt,
          duration: ts.duration,
        })),
      });
      setStep('edit');
      setErrors({});
      setDiffReview([]);
    }
  }, [isOpen, booking]);

  const formatDateForInput = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
  };

  const formatDateForDisplay = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFieldChange = (field: keyof BookingEditInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const validation = validateFormPayload({
      firstName: formData.firstName || booking.firstName,
      lastName: formData.lastName || booking.lastName,
      phone: formData.phone || booking.phone,
      email: formData.email !== undefined ? formData.email : booking.email,
      service: formData.service || booking.service,
      startAt: formData.startAt ? new Date(formData.startAt).toISOString() : new Date(booking.startAt).toISOString(),
      endAt: formData.endAt ? new Date(formData.endAt).toISOString() : new Date(booking.endAt).toISOString(),
      address: formData.address !== undefined ? formData.address : booking.address,
      pickupAddress: formData.pickupAddress !== undefined ? formData.pickupAddress : booking.pickupAddress,
      dropoffAddress: formData.dropoffAddress !== undefined ? formData.dropoffAddress : booking.dropoffAddress,
      quantity: formData.quantity !== undefined ? formData.quantity : booking.quantity,
      afterHours: formData.afterHours !== undefined ? formData.afterHours : booking.afterHours,
      holiday: formData.holiday !== undefined ? formData.holiday : booking.holiday,
      pets: (formData.pets || booking.pets || []).map((p: any) => ({
        name: p.name,
        species: p.species,
      })),
      notes: formData.notes !== undefined ? formData.notes : booking.notes,
    });

    if (!validation.success) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return false;
    }

    return true;
  };

  const buildDiffReview = (): DiffReview[] => {
    const diffs: DiffReview[] = [];

    // Schedule changes
    if (formData.startAt && new Date(formData.startAt).getTime() !== new Date(booking.startAt).getTime()) {
      diffs.push({
        field: 'startAt',
        label: 'Start Date & Time',
        oldValue: formatDateForDisplay(booking.startAt),
        newValue: formatDateForDisplay(formData.startAt),
      });
    }
    if (formData.endAt && new Date(formData.endAt).getTime() !== new Date(booking.endAt).getTime()) {
      diffs.push({
        field: 'endAt',
        label: 'End Date & Time',
        oldValue: formatDateForDisplay(booking.endAt),
        newValue: formatDateForDisplay(formData.endAt),
      });
    }

    // Service type
    if (formData.service && formData.service !== booking.service) {
      diffs.push({
        field: 'service',
        label: 'Service Type',
        oldValue: booking.service,
        newValue: formData.service,
      });
    }

    // Pet quantity
    const originalPetCount = booking.pets?.length || 0;
    const updatedPetCount = formData.pets?.length || 0;
    if (updatedPetCount !== originalPetCount) {
      diffs.push({
        field: 'pets',
        label: 'Pet Count',
        oldValue: `${originalPetCount} pet${originalPetCount !== 1 ? 's' : ''}`,
        newValue: `${updatedPetCount} pet${updatedPetCount !== 1 ? 's' : ''}`,
      });
    }

    // Address changes
    if (formData.address !== undefined && formData.address !== booking.address) {
      diffs.push({
        field: 'address',
        label: 'Address',
        oldValue: booking.address || '(none)',
        newValue: formData.address || '(none)',
      });
    }
    if (formData.pickupAddress !== undefined && formData.pickupAddress !== booking.pickupAddress) {
      diffs.push({
        field: 'pickupAddress',
        label: 'Pickup Address',
        oldValue: booking.pickupAddress || '(none)',
        newValue: formData.pickupAddress || '(none)',
      });
    }
    if (formData.dropoffAddress !== undefined && formData.dropoffAddress !== booking.dropoffAddress) {
      diffs.push({
        field: 'dropoffAddress',
        label: 'Dropoff Address',
        oldValue: booking.dropoffAddress || '(none)',
        newValue: formData.dropoffAddress || '(none)',
      });
    }

    return diffs;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Check for high-risk changes
    const diffs = buildDiffReview();
    const highRiskFields = ['startAt', 'endAt', 'service', 'pets', 'address', 'pickupAddress', 'dropoffAddress'];
    const hasHighRiskChanges = diffs.some(diff => highRiskFields.includes(diff.field));

    if (hasHighRiskChanges && step === 'edit') {
      // Show diff review
      setDiffReview(diffs);
      setStep('review');
      return;
    }

    // Proceed with save
    setSaving(true);
    try {
      const result = await onSave(formData);
      if (result.success) {
        onClose();
      } else {
        alert(result.error || 'Failed to save booking');
      }
    } catch (error) {
      console.error('Failed to save booking:', error);
      alert('Failed to save booking');
    } finally {
      setSaving(false);
    }
  };

  const modalSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 'full' : 'xl';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'review' ? 'Review Changes' : 'Edit Booking'}
      size={modalSize}
    >
      {step === 'edit' ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: typeof window !== 'undefined' && window.innerWidth < 768
              ? tokens.spacing[4]
              : tokens.spacing[6],
            maxHeight: 'calc(90vh - 120px)',
            overflowY: 'auto',
            padding: typeof window !== 'undefined' && window.innerWidth < 768
              ? tokens.spacing[3]
              : 0,
          }}
        >
          {/* Service and Schedule */}
          <div>
            <h3
              style={{
                fontSize: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.typography.fontSize.base[0]
                  : tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.spacing[3]
                  : tokens.spacing[4],
              }}
            >
              Service & Schedule
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.spacing[3]
                  : tokens.spacing[4],
              }}
            >
              <Select
                label="Service"
                value={formData.service}
                onChange={(e) => handleFieldChange('service', e.target.value)}
                options={VALID_SERVICES.map(s => ({ value: s, label: s }))}
                error={errors.service}
              />
              <Input
                type="datetime-local"
                label="Start Date & Time"
                value={formData.startAt ? formatDateForInput(formData.startAt) : ''}
                onChange={(e) => handleFieldChange('startAt', new Date(e.target.value))}
                error={errors.startAt}
              />
              <Input
                type="datetime-local"
                label="End Date & Time"
                value={formData.endAt ? formatDateForInput(formData.endAt) : ''}
                onChange={(e) => handleFieldChange('endAt', new Date(e.target.value))}
                error={errors.endAt}
              />
              <Input
                type="number"
                label="Quantity"
                value={formData.quantity?.toString() || '1'}
                onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 1)}
                error={errors.quantity}
              />
              <div
                style={{
                  display: 'flex',
                  gap: tokens.spacing[4],
                  alignItems: 'center',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing[2],
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.afterHours || false}
                    onChange={(e) => handleFieldChange('afterHours', e.target.checked)}
                  />
                  <span>After Hours</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing[2],
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.holiday || false}
                    onChange={(e) => handleFieldChange('holiday', e.target.checked)}
                  />
                  <span>Holiday</span>
                </label>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div>
            <h3
              style={{
                fontSize: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.typography.fontSize.base[0]
                  : tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.spacing[3]
                  : tokens.spacing[4],
              }}
            >
              Client Information
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.spacing[3]
                  : tokens.spacing[4],
              }}
            >
              <Input
                label="First Name"
                value={formData.firstName || ''}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                error={errors.firstName}
              />
              <Input
                label="Last Name"
                value={formData.lastName || ''}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                error={errors.lastName}
              />
              <Input
                label="Phone"
                value={formData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                error={errors.phone}
              />
              <Input
                type="email"
                label="Email"
                value={formData.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value || null)}
                error={errors.email}
              />
            </div>
          </div>

          {/* Addresses */}
          <div>
            <h3
              style={{
                fontSize: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.typography.fontSize.base[0]
                  : tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.spacing[3]
                  : tokens.spacing[4],
              }}
            >
              Addresses
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.spacing[3]
                  : tokens.spacing[4],
              }}
            >
              <Input
                label="Service Address"
                value={formData.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value || null)}
                error={errors.address}
              />
              <Input
                label="Pickup Address"
                value={formData.pickupAddress || ''}
                onChange={(e) => handleFieldChange('pickupAddress', e.target.value || null)}
                error={errors.pickupAddress}
              />
              <Input
                label="Dropoff Address"
                value={formData.dropoffAddress || ''}
                onChange={(e) => handleFieldChange('dropoffAddress', e.target.value || null)}
                error={errors.dropoffAddress}
              />
            </div>
          </div>

          {/* Pets */}
          <div>
            <h3
              style={{
                fontSize: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.typography.fontSize.base[0]
                  : tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.spacing[3]
                  : tokens.spacing[4],
              }}
            >
              Pets ({formData.pets?.length || 0})
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.spacing[2]
                  : tokens.spacing[3],
              }}
            >
              {(formData.pets || []).map((pet, index) => (
                <div
                  key={index}
                  style={{
                    padding: typeof window !== 'undefined' && window.innerWidth < 768
                      ? tokens.spacing[3]
                      : tokens.spacing[4],
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.borderRadius.md,
                    backgroundColor: tokens.colors.background.secondary,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768
                        ? '1fr'
                        : '1fr 1fr',
                      gap: typeof window !== 'undefined' && window.innerWidth < 768
                        ? tokens.spacing[2]
                        : tokens.spacing[3],
                    }}
                  >
                    <Input
                      label="Pet Name"
                      value={pet.name}
                      onChange={(e) => {
                        const newPets = [...(formData.pets || [])];
                        newPets[index] = { ...pet, name: e.target.value };
                        handleFieldChange('pets', newPets);
                      }}
                    />
                    <Input
                      label="Species"
                      value={pet.species}
                      onChange={(e) => {
                        const newPets = [...(formData.pets || [])];
                        newPets[index] = { ...pet, species: e.target.value };
                        handleFieldChange('pets', newPets);
                      }}
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() => {
                  handleFieldChange('pets', [
                    ...(formData.pets || []),
                    { name: '', species: 'Dog' },
                  ]);
                }}
              >
                Add Pet
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3
              style={{
                fontSize: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.typography.fontSize.base[0]
                  : tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: typeof window !== 'undefined' && window.innerWidth < 768
                  ? tokens.spacing[3]
                  : tokens.spacing[4],
              }}
            >
              Notes
            </h3>
            <Textarea
              label="Booking Notes"
              value={formData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value || null)}
              rows={4}
              error={errors.notes}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[4],
          }}
        >
          <div
            style={{
              padding: tokens.spacing[4],
              backgroundColor: tokens.colors.warning[50],
              borderRadius: tokens.borderRadius.md,
              border: `1px solid ${tokens.colors.warning[200]}`,
            }}
          >
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
              }}
            >
              The following high-risk changes will be applied. Please review carefully.
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing[3],
            }}
          >
            {diffReview.map((diff, index) => (
              <div
                key={index}
                style={{
                  padding: tokens.spacing[4],
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.borderRadius.md,
                }}
              >
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    fontWeight: tokens.typography.fontWeight.semibold,
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing[2],
                  }}
                >
                  {diff.label}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: tokens.spacing[4],
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.xs[0],
                        color: tokens.colors.text.secondary,
                        marginBottom: tokens.spacing[1],
                      }}
                    >
                      Current
                    </div>
                    <div
                      style={{
                        padding: tokens.spacing[2],
                        backgroundColor: tokens.colors.error[50],
                        borderRadius: tokens.borderRadius.sm,
                        fontSize: tokens.typography.fontSize.sm[0],
                      }}
                    >
                      {diff.oldValue}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.xs[0],
                        color: tokens.colors.text.secondary,
                        marginBottom: tokens.spacing[1],
                      }}
                    >
                      New
                    </div>
                    <div
                      style={{
                        padding: tokens.spacing[2],
                        backgroundColor: tokens.colors.success[50],
                        borderRadius: tokens.borderRadius.sm,
                        fontSize: tokens.typography.fontSize.sm[0],
                      }}
                    >
                      {diff.newValue}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: tokens.spacing[3],
          justifyContent: 'flex-end',
          marginTop: tokens.spacing[6],
          paddingTop: tokens.spacing[4],
          borderTop: `1px solid ${tokens.colors.border.default}`,
        }}
      >
        {step === 'review' ? (
          <>
            <Button variant="secondary" onClick={() => setStep('edit')}>
              Back to Edit
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={saving}>
              Confirm Changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={saving}>
              Save Changes
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

