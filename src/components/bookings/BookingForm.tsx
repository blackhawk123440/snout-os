/**
 * BookingForm Component
 * 
 * Unified booking form for create and edit modes.
 * Works on both mobile (bottom sheet) and desktop (modal/page).
 * Uses existing validation and mapper from form-to-booking-mapper.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, FormRow, SectionHeader } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { VALID_SERVICES } from '@/lib/validation/form-booking';
import { bookingToFormValues, BookingFormValues } from '@/lib/bookings/booking-form-mapper';

export interface BookingFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<BookingFormValues>;
  bookingId?: string;
  onSubmit: (values: BookingFormValues) => Promise<void>;
  onCancel: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
}) => {
  const isMobile = useMobile();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formValues, setFormValues] = useState<BookingFormValues>({
    firstName: initialValues?.firstName || '',
    lastName: initialValues?.lastName || '',
    phone: initialValues?.phone || '',
    email: initialValues?.email || '',
    address: initialValues?.address || '',
    pickupAddress: initialValues?.pickupAddress || '',
    dropoffAddress: initialValues?.dropoffAddress || '',
    service: initialValues?.service || VALID_SERVICES[0],
    startAt: initialValues?.startAt || new Date().toISOString(),
    endAt: initialValues?.endAt || new Date(Date.now() + 3600000).toISOString(),
    pets: initialValues?.pets || [{ name: '', species: 'Dog' }],
    notes: initialValues?.notes || '',
    afterHours: initialValues?.afterHours || false,
    holiday: initialValues?.holiday || false,
  });

  // Update form when initialValues change (for edit mode)
  useEffect(() => {
    if (initialValues && mode === 'edit') {
      setFormValues(prev => ({
        ...prev,
        ...initialValues,
      }));
    }
  }, [initialValues, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formValues.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formValues.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formValues.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formValues.service) newErrors.service = 'Service is required';
    if (formValues.pets.length === 0 || formValues.pets.some(p => !p.name.trim() || !p.species.trim())) {
      newErrors.pets = 'At least one pet with name and species is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formValues);
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save booking' });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof BookingFormValues, value: any) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const addPet = () => {
    setFormValues(prev => ({
      ...prev,
      pets: [...prev.pets, { name: '', species: 'Dog' }],
    }));
  };

  const removePet = (index: number) => {
    setFormValues(prev => ({
      ...prev,
      pets: prev.pets.filter((_, i) => i !== index),
    }));
  };

  const updatePet = (index: number, field: 'name' | 'species', value: string) => {
    setFormValues(prev => ({
      ...prev,
      pets: prev.pets.map((pet, i) => i === index ? { ...pet, [field]: value } : pet),
    }));
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[6] }}>
      {/* Client Information */}
      <Card>
        <SectionHeader title="Client Information" />
        <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <FormRow label="First Name" error={errors.firstName}>
            <Input
              value={formValues.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              placeholder="First name"
              required
            />
          </FormRow>
          <FormRow label="Last Name" error={errors.lastName}>
            <Input
              value={formValues.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              placeholder="Last name"
              required
            />
          </FormRow>
          <FormRow label="Phone" error={errors.phone}>
            <Input
              type="tel"
              value={formValues.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="Phone number"
              required
            />
          </FormRow>
          <FormRow label="Email" error={errors.email}>
            <Input
              type="email"
              value={formValues.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Email address"
            />
          </FormRow>
          <FormRow label="Address" error={errors.address}>
            <Input
              value={formValues.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Service address"
            />
          </FormRow>
        </div>
      </Card>

      {/* Service Information */}
      <Card>
        <SectionHeader title="Service Details" />
        <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <FormRow label="Service Type" error={errors.service}>
            <Select
              value={formValues.service}
              onChange={(e) => updateField('service', e.target.value)}
              options={VALID_SERVICES.map(s => ({ value: s, label: s }))}
              required
            />
          </FormRow>
          <FormRow label="Start Date & Time" error={errors.startAt}>
            <Input
              type="datetime-local"
              value={formValues.startAt ? new Date(formValues.startAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateField('startAt', new Date(e.target.value).toISOString())}
              required
            />
          </FormRow>
          <FormRow label="End Date & Time" error={errors.endAt}>
            <Input
              type="datetime-local"
              value={formValues.endAt ? new Date(formValues.endAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateField('endAt', new Date(e.target.value).toISOString())}
              required
            />
          </FormRow>
        </div>
      </Card>

      {/* Pets */}
      <Card>
        <SectionHeader 
          title="Pets" 
          action={
            <Button type="button" variant="secondary" size="sm" onClick={addPet}>
              Add Pet
            </Button>
          }
        />
        <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          {formValues.pets.map((pet, index) => (
            <div key={index} style={{ display: 'flex', gap: tokens.spacing[3], alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <FormRow label="Pet Name" error={errors.pets && index === 0 ? errors.pets : undefined}>
                  <Input
                    value={pet.name}
                    onChange={(e) => updatePet(index, 'name', e.target.value)}
                    placeholder="Pet name"
                    required
                  />
                </FormRow>
              </div>
              <div style={{ flex: 1 }}>
                <FormRow label="Species">
                  <Select
                    value={pet.species}
                    onChange={(e) => updatePet(index, 'species', e.target.value)}
                    options={[
                      { value: 'Dog', label: 'Dog' },
                      { value: 'Cat', label: 'Cat' },
                      { value: 'Bird', label: 'Bird' },
                      { value: 'Reptile', label: 'Reptile' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    required
                  />
                </FormRow>
              </div>
              {formValues.pets.length > 1 && (
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={() => removePet(index)}
                  style={{ marginTop: tokens.spacing[6] }}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <SectionHeader title="Notes" />
        <div style={{ padding: tokens.spacing[4] }}>
          <FormRow label="Additional Notes" error={errors.notes}>
            <textarea
              value={formValues.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional notes or special instructions"
              style={{
                width: '100%',
                minHeight: '100px',
                padding: tokens.spacing[3],
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.fontSize.base[0],
                fontFamily: tokens.typography.fontFamily.sans.join(', '),
                resize: 'vertical',
              }}
            />
          </FormRow>
        </div>
      </Card>

      {/* Submit Errors */}
      {errors.submit && (
        <Card style={{ backgroundColor: tokens.colors.error[50], padding: tokens.spacing[4] }}>
          <div style={{ color: tokens.colors.error.DEFAULT }}>{errors.submit}</div>
        </Card>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create Booking' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

