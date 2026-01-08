/**
 * Edit Booking Modal
 * 
 * Modal for editing booking details with validation and pricing recalculation.
 */

'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Textarea } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  age?: number | null;
  notes?: string | null;
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
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  quantity: number;
  afterHours: boolean;
  holiday: boolean;
  notes?: string | null;
  pets: Pet[];
}

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSave: (updatedBooking: Partial<Booking>) => Promise<void>;
}

export function EditBookingModal({ isOpen, onClose, booking, onSave }: EditBookingModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    pickupAddress: '',
    dropoffAddress: '',
    service: '',
    startAt: '',
    endAt: '',
    quantity: 1,
    afterHours: false,
    holiday: false,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (booking && isOpen) {
      setFormData({
        firstName: booking.firstName || '',
        lastName: booking.lastName || '',
        phone: booking.phone || '',
        email: booking.email || '',
        address: booking.address || '',
        pickupAddress: booking.pickupAddress || '',
        dropoffAddress: booking.dropoffAddress || '',
        service: booking.service || '',
        startAt: booking.startAt ? (typeof booking.startAt === 'string' ? booking.startAt : new Date(booking.startAt).toISOString().slice(0, 16)) : '',
        endAt: booking.endAt ? (typeof booking.endAt === 'string' ? booking.endAt : new Date(booking.endAt).toISOString().slice(0, 16)) : '',
        quantity: booking.quantity || 1,
        afterHours: booking.afterHours || false,
        holiday: booking.holiday || false,
        notes: booking.notes || '',
      });
      setError(null);
    }
  }, [booking, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setSaving(true);
    setError(null);

    try {
      const updates: Partial<Booking> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        pickupAddress: formData.pickupAddress || null,
        dropoffAddress: formData.dropoffAddress || null,
        service: formData.service,
        startAt: new Date(formData.startAt),
        endAt: new Date(formData.endAt),
        quantity: formData.quantity,
        afterHours: formData.afterHours,
        holiday: formData.holiday,
        notes: formData.notes || null,
      };

      await onSave(updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save booking');
    } finally {
      setSaving(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Booking"
      size="full"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        {error && (
          <div
            style={{
              padding: tokens.spacing[3],
              backgroundColor: tokens.colors.error[50],
              color: tokens.colors.error.DEFAULT,
              borderRadius: tokens.borderRadius.md,
              fontSize: tokens.typography.fontSize.sm[0],
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: tokens.spacing[4] }}>
          <Input
            label="First Name *"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
          <Input
            label="Last Name *"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: tokens.spacing[4] }}>
          <Input
            label="Phone *"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: tokens.typography.fontSize.sm[0],
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[2],
              color: tokens.colors.text.primary,
            }}
          >
            Service *
          </label>
          <select
            required
            value={formData.service}
            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
            style={{
              width: '100%',
              padding: tokens.spacing[3],
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.borderRadius.md,
              fontSize: tokens.typography.fontSize.base[0],
              backgroundColor: tokens.colors.background.primary,
              color: tokens.colors.text.primary,
            }}
          >
            <option value="Dog Walking">Dog Walking</option>
            <option value="Housesitting">Housesitting</option>
            <option value="24/7 Care">24/7 Care</option>
            <option value="Drop-ins">Drop-ins</option>
            <option value="Pet Taxi">Pet Taxi</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: tokens.spacing[4] }}>
          <Input
            label="Start Date & Time *"
            type="datetime-local"
            value={formData.startAt}
            onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
            required
          />
          <Input
            label="End Date & Time *"
            type="datetime-local"
            value={formData.endAt}
            onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
            required
          />
        </div>

        <Input
          label="Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: tokens.spacing[4] }}>
          <Input
            label="Pickup Address"
            value={formData.pickupAddress}
            onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
          />
          <Input
            label="Dropoff Address"
            value={formData.dropoffAddress}
            onChange={(e) => setFormData({ ...formData, dropoffAddress: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: tokens.spacing[4] }}>
          <Input
            label="Quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], paddingTop: tokens.spacing[6] }}>
            <input
              type="checkbox"
              id="afterHours"
              checked={formData.afterHours}
              onChange={(e) => setFormData({ ...formData, afterHours: e.target.checked })}
            />
            <label htmlFor="afterHours" style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
              After Hours
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], paddingTop: tokens.spacing[6] }}>
            <input
              type="checkbox"
              id="holiday"
              checked={formData.holiday}
              onChange={(e) => setFormData({ ...formData, holiday: e.target.checked })}
            />
            <label htmlFor="holiday" style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
              Holiday
            </label>
          </div>
        </div>

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
        />

        <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4] }}>
          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            style={{ flex: 1 }}
          >
            Save Changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

