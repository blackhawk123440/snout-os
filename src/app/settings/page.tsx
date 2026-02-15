/**
 * Settings Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Tabs,
  TabPanel,
  Card,
  Input,
  Select,
  Button,
  FormRow,
  Skeleton,
  MobileFilterBar,
  Flex,
  Grid,
  GridCol,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

interface Settings {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  stripeSecretKey: string;
  stripePublishableKey: string;
  ownerPersonalPhone: string;
  automation: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    autoConfirm: boolean;
    reminderTiming: string;
    paymentReminders: boolean;
    sitterNotifications: boolean;
    ownerAlerts: boolean;
  };
  conflictNoticeEnabled: boolean;
}

type SettingsTab = 'general' | 'integrations' | 'automations' | 'rotation' | 'advanced';

export default function SettingsPage() {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<Settings>({
    businessName: 'Snout Services',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    stripeSecretKey: '',
    stripePublishableKey: '',
    ownerPersonalPhone: '',
    automation: {
      smsEnabled: true,
      emailEnabled: false,
      autoConfirm: false,
      reminderTiming: '24h',
      paymentReminders: true,
      sitterNotifications: true,
      ownerAlerts: true,
    },
    conflictNoticeEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.settings) {
        setSettings((prev) => ({
          businessName: data.settings.businessName ?? prev.businessName ?? '',
          businessPhone: data.settings.businessPhone ?? prev.businessPhone ?? '',
          businessEmail: data.settings.businessEmail ?? prev.businessEmail ?? '',
          businessAddress: data.settings.businessAddress ?? prev.businessAddress ?? '',
          stripeSecretKey: data.settings.stripeSecretKey ?? prev.stripeSecretKey ?? '',
          stripePublishableKey: data.settings.stripePublishableKey ?? prev.stripePublishableKey ?? '',
          ownerPersonalPhone: data.settings.ownerPersonalPhone ?? prev.ownerPersonalPhone ?? '',
          automation: data.settings.automation ?? prev.automation,
          conflictNoticeEnabled:
            data.settings.conflictNoticeEnabled ?? prev.conflictNoticeEnabled ?? true,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.automation) {
          setSettings((prev) => ({
            ...prev,
            automation: data.automation,
          }));
        }
        alert('Settings saved successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to save settings: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setSaving(false);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('automation.')) {
      const automationField = field.split('.')[1];
      setSettings((prev) => ({
        ...prev,
        automation: {
          ...prev.automation,
          [automationField]: value,
        },
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <i className="fas fa-cog" /> },
    { id: 'integrations', label: 'Integrations', icon: <i className="fas fa-plug" /> },
    { id: 'automations', label: 'Automations', icon: <i className="fas fa-robot" /> },
    { id: 'rotation', label: 'Rotation', icon: <i className="fas fa-sync-alt" /> },
    { id: 'advanced', label: 'Advanced', icon: <i className="fas fa-sliders-h" /> },
  ];

  // Helper function to render tab content
  const renderTabContent = (tabId: SettingsTab) => {
    switch (tabId) {
      case 'general':
        return (
          <Card>
            <h3
              style={{
                fontSize: tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[6],
                color: tokens.colors.text.primary,
              }}
            >
              Business Information
            </h3>
            <FormRow label="Business Name" required>
              <Input
                value={settings.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
              />
            </FormRow>
            <FormRow label="Business Phone">
              <Input
                type="tel"
                value={settings.businessPhone}
                onChange={(e) => handleInputChange('businessPhone', e.target.value)}
              />
            </FormRow>
            <FormRow label="Business Email">
              <Input
                type="email"
                value={settings.businessEmail}
                onChange={(e) => handleInputChange('businessEmail', e.target.value)}
              />
            </FormRow>
            <FormRow label="Business Address">
              <Input
                value={settings.businessAddress}
                onChange={(e) => handleInputChange('businessAddress', e.target.value)}
              />
            </FormRow>
          </Card>
        );
      case 'integrations':
        return (
          <Card>
            <h3
              style={{
                fontSize: tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[6],
                color: tokens.colors.text.primary,
              }}
            >
              Payment Integration (Stripe)
            </h3>
            <FormRow label="Stripe Secret Key">
              <Input
                type="password"
                value={settings.stripeSecretKey}
                onChange={(e) => handleInputChange('stripeSecretKey', e.target.value)}
              />
            </FormRow>
            <FormRow label="Stripe Publishable Key">
              <Input
                value={settings.stripePublishableKey}
                onChange={(e) => handleInputChange('stripePublishableKey', e.target.value)}
              />
            </FormRow>

            <h3
              style={{
                fontSize: tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginTop: tokens.spacing[8],
                marginBottom: tokens.spacing[6],
                color: tokens.colors.text.primary,
              }}
            >
              Messaging Provider
            </h3>
            <div style={{
              padding: tokens.spacing[4],
              backgroundColor: tokens.colors.primary[50],
              borderRadius: tokens.borderRadius.md,
              border: `1px solid ${tokens.colors.primary[200]}`,
            }}>
              <p style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[3],
              }}>
                Messaging is now configured in the Messages tab. Go to <strong>Messages → Twilio Setup</strong> to configure your messaging provider.
              </p>
              <Link href="/messages?tab=setup">
                <Button variant="primary" leftIcon={<i className="fas fa-comments" />}>
                  Go to Messaging Setup
                </Button>
              </Link>
            </div>
          </Card>
        );
      case 'automations':
        return (
          <Card>
            <h3
              style={{
                fontSize: tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[6],
                color: tokens.colors.text.primary,
              }}
            >
              Automation Settings
            </h3>
            <FormRow>
              <label style={{ cursor: 'pointer' }}>
                <Flex align="center" gap={3}> {/* Batch 5: UI Constitution compliance */}
                  <input
                    type="checkbox"
                    checked={settings.automation.smsEnabled}
                    onChange={(e) => handleInputChange('automation.smsEnabled', e.target.checked)}
                  />
                  <span>Enable SMS Notifications</span>
                </Flex>
              </label>
            </FormRow>
            <FormRow>
              <label style={{ cursor: 'pointer' }}>
                <Flex align="center" gap={3}> {/* Batch 5: UI Constitution compliance */}
                  <input
                    type="checkbox"
                    checked={settings.automation.emailEnabled}
                    onChange={(e) => handleInputChange('automation.emailEnabled', e.target.checked)}
                  />
                  <span>Enable Email Notifications</span>
                </Flex>
              </label>
            </FormRow>
            <FormRow>
              <label style={{ cursor: 'pointer' }}>
                <Flex align="center" gap={3}> {/* Batch 5: UI Constitution compliance */}
                  <input
                    type="checkbox"
                    checked={settings.automation.autoConfirm}
                    onChange={(e) => handleInputChange('automation.autoConfirm', e.target.checked)}
                  />
                  <span>Auto-confirm Bookings</span>
                </Flex>
              </label>
            </FormRow>
            <FormRow label="Reminder Timing">
              <Select
                options={[
                  { value: '24h', label: '24 Hours Before' },
                  { value: '12h', label: '12 Hours Before' },
                  { value: '6h', label: '6 Hours Before' },
                  { value: '1h', label: '1 Hour Before' },
                ]}
                value={settings.automation.reminderTiming}
                onChange={(e) => handleInputChange('automation.reminderTiming', e.target.value)}
              />
            </FormRow>
          </Card>
        );
      case 'rotation':
        return (
          <Card>
            <p style={{ marginBottom: tokens.spacing[4], color: tokens.colors.text.secondary }}>
              Configure pool number rotation and lifecycle settings. 
              <a href="/settings/rotation" style={{ marginLeft: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>
                Open full Rotation Settings page →
              </a>
            </p>
          </Card>
        );
      case 'advanced':
        return (
          <Card>
            <h3
              style={{
                fontSize: tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[6],
                color: tokens.colors.text.primary,
              }}
            >
              Advanced Settings
            </h3>
            <FormRow label="Owner Personal Phone">
              <Input
                type="tel"
                value={settings.ownerPersonalPhone}
                onChange={(e) => handleInputChange('ownerPersonalPhone', e.target.value)}
              />
            </FormRow>
            <FormRow label="Owner OpenPhone">
              <Input
                type="tel"
                value={settings.ownerOpenphonePhone}
                onChange={(e) => handleInputChange('ownerOpenphonePhone', e.target.value)}
              />
            </FormRow>
            <FormRow label="Owner Phone Type">
              <Select
                options={[
                  { value: 'personal', label: 'Personal' },
                  { value: 'openphone', label: 'OpenPhone' },
                ]}
                value={settings.ownerPhoneType}
                onChange={(e) => handleInputChange('ownerPhoneType', e.target.value)}
              />
            </FormRow>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Configure business settings, integrations, and automations"
        actions={
          <Button variant="primary" onClick={handleSave} isLoading={saving}>
            Save Settings
          </Button>
        }
      />

      {loading ? (
        <Card>
          <Skeleton height="400px" />
        </Card>
      ) : (
        <>
          {isMobile ? (
            <>
              <MobileFilterBar
                activeFilter={activeTab}
                onFilterChange={(filterId) => setActiveTab(filterId as SettingsTab)}
                sticky
                options={tabs.map(tab => ({ id: tab.id, label: tab.label }))}
              />
              {renderTabContent(activeTab)}
            </>
          ) : (
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as SettingsTab)}>
              <TabPanel id="general">
                {renderTabContent('general')}
              </TabPanel>
              <TabPanel id="integrations">
                {renderTabContent('integrations')}
              </TabPanel>
              <TabPanel id="automations">
                {renderTabContent('automations')}
              </TabPanel>
              <TabPanel id="rotation">
                {renderTabContent('rotation')}
              </TabPanel>
              <TabPanel id="advanced">
                {renderTabContent('advanced')}
              </TabPanel>
            </Tabs>
          )}
        </>
      )}
    </AppShell>
  );
}

