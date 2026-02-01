/**
 * Rotation Settings Page
 * 
 * Configure pool number rotation and lifecycle settings.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  FormRow,
  Skeleton,
  Alert,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface RotationSettings {
  poolSelectionStrategy: 'LRU' | 'FIFO' | 'RANDOM';
  stickyReuseDays: number;
  postBookingGraceHours: number;
  inactivityReleaseDays: number;
  maxPoolThreadLifetimeDays: number;
  minPoolReserve: number;
}

const DEFAULT_SETTINGS: RotationSettings = {
  poolSelectionStrategy: 'LRU',
  stickyReuseDays: 7,
  postBookingGraceHours: 72,
  inactivityReleaseDays: 7,
  maxPoolThreadLifetimeDays: 30,
  minPoolReserve: 3,
};

export default function RotationSettingsPage() {
  const [settings, setSettings] = useState<RotationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/rotation');
      if (!response.ok) {
        throw new Error('Failed to fetch rotation settings');
      }
      const data = await response.json();
      setSettings(data);
    } catch (err: any) {
      console.error('Error fetching rotation settings:', err);
      setError(err.message || 'Failed to load settings');
      // Use defaults on error
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch('/api/settings/rotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving rotation settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Rotation Settings" description="Configure pool number rotation and lifecycle" />
        <Card>
          <Skeleton height="400px" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Rotation Settings"
        description="Configure pool number rotation strategy and lifecycle management"
        actions={
          <Button variant="primary" onClick={handleSave} isLoading={saving}>
            Save Settings
          </Button>
        }
      />

      {error && (
        <Alert variant="error" style={{ marginBottom: tokens.spacing[4] }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" style={{ marginBottom: tokens.spacing[4] }}>
          Settings saved successfully
        </Alert>
      )}

      <Card>
        <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
          Pool Selection Strategy
        </h3>
        <FormRow label="Selection Strategy" required>
          <Select
            value={settings.poolSelectionStrategy}
            onChange={(e) => setSettings({ ...settings, poolSelectionStrategy: e.target.value as 'LRU' | 'FIFO' | 'RANDOM' })}
            options={[
              { value: 'LRU', label: 'Least Recently Used (LRU)' },
              { value: 'FIFO', label: 'First In First Out (FIFO)' },
              { value: 'RANDOM', label: 'Random' },
            ]}
          />
          <p style={{ marginTop: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            How pool numbers are selected when assigning to new threads. LRU minimizes number churn.
          </p>
        </FormRow>

        <h3 style={{ marginTop: tokens.spacing[6], marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
          Lifecycle Settings
        </h3>

        <FormRow label="Sticky Reuse Days" required>
          <Input
            type="number"
            min="0"
            value={settings.stickyReuseDays}
            onChange={(e) => setSettings({ ...settings, stickyReuseDays: parseInt(e.target.value) || 0 })}
          />
          <p style={{ marginTop: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            Days a pool number stays assigned to a thread before being eligible for rotation (0 = immediate rotation allowed).
          </p>
        </FormRow>

        <FormRow label="Post-Booking Grace Hours" required>
          <Input
            type="number"
            min="0"
            value={settings.postBookingGraceHours}
            onChange={(e) => setSettings({ ...settings, postBookingGraceHours: parseInt(e.target.value) || 0 })}
          />
          <p style={{ marginTop: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            Hours after booking ends before pool number can be released (0 = immediate release).
          </p>
        </FormRow>

        <FormRow label="Inactivity Release Days" required>
          <Input
            type="number"
            min="0"
            value={settings.inactivityReleaseDays}
            onChange={(e) => setSettings({ ...settings, inactivityReleaseDays: parseInt(e.target.value) || 0 })}
          />
          <p style={{ marginTop: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            Days of no messages before pool number is released back to pool (0 = never auto-release).
          </p>
        </FormRow>

        <FormRow label="Max Pool Thread Lifetime (Days)" required>
          <Input
            type="number"
            min="1"
            value={settings.maxPoolThreadLifetimeDays}
            onChange={(e) => setSettings({ ...settings, maxPoolThreadLifetimeDays: parseInt(e.target.value) || 30 })}
          />
          <p style={{ marginTop: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            Maximum days a pool number can be bound to a single thread before forced rotation.
          </p>
        </FormRow>

        <FormRow label="Minimum Pool Reserve" required>
          <Input
            type="number"
            min="0"
            value={settings.minPoolReserve}
            onChange={(e) => setSettings({ ...settings, minPoolReserve: parseInt(e.target.value) || 0 })}
          />
          <p style={{ marginTop: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            Minimum number of pool numbers that must remain available. Triggers alert when below threshold.
          </p>
        </FormRow>
      </Card>
    </AppShell>
  );
}
