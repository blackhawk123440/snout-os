/**
 * Business Settings Page - Enterprise Rebuild
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
  Input,
  Select,
  Textarea,
  FormRow,
  Skeleton,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

export default function BusinessSettingsPage() {
  const [settings, setSettings] = useState({
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    timeZone: 'America/New_York',
    operatingHours: {},
    holidays: [] as string[],
    taxSettings: {},
    contentBlocks: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/business-settings');
      const data = await response.json();
      if (data.settings) {
        setSettings({
          businessName: data.settings.businessName || '',
          businessPhone: data.settings.businessPhone || '',
          businessEmail: data.settings.businessEmail || '',
          businessAddress: data.settings.businessAddress || '',
          timeZone: data.settings.timeZone || 'America/New_York',
          operatingHours: data.settings.operatingHours ? JSON.parse(data.settings.operatingHours) : {},
          holidays: data.settings.holidays ? JSON.parse(data.settings.holidays) : [],
          taxSettings: data.settings.taxSettings ? JSON.parse(data.settings.taxSettings) : {},
          contentBlocks: data.settings.contentBlocks ? JSON.parse(data.settings.contentBlocks) : {},
        });
      }
    } catch (error) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/business-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          operatingHours: JSON.stringify(settings.operatingHours),
          holidays: JSON.stringify(settings.holidays),
          taxSettings: JSON.stringify(settings.taxSettings),
          contentBlocks: JSON.stringify(settings.contentBlocks),
        }),
      });

      if (response.ok) {
        setSuccessMessage('Settings saved successfully!');
      } else {
        setError('Failed to save settings');
      }
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const timeZoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
  ];

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Business Settings"
        description="Configure your business information and preferences"
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

        {loading ? (
          <Card>
            <div style={{ padding: tokens.spacing[6] }}>
              <Skeleton height={400} />
            </div>
          </Card>
        ) : (
          <>
            <Card style={{ marginBottom: tokens.spacing[6] }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                <FormRow label="Business Name" required>
                  <Input
                    type="text"
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  />
                </FormRow>

                <FormRow label="Business Phone">
                  <Input
                    type="tel"
                    value={settings.businessPhone}
                    onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                  />
                </FormRow>

                <FormRow label="Business Email">
                  <Input
                    type="email"
                    value={settings.businessEmail}
                    onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                  />
                </FormRow>

                <FormRow label="Business Address">
                  <Textarea
                    value={settings.businessAddress}
                    onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                    rows={3}
                  />
                </FormRow>

                <FormRow label="Time Zone">
                  <Select
                    value={settings.timeZone}
                    onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                    options={timeZoneOptions}
                  />
                </FormRow>
              </div>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={handleSave} disabled={saving} isLoading={saving}>
                Save Settings
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
