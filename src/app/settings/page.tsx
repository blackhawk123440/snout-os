/**
 * Settings Page - Canonical owner control plane
 *
 * Single source of truth for: Business, Services, Pricing, Notifications,
 * Tiers (link), AI (link), Integrations (link), Advanced (rotation, service areas).
 * All sections that have controls persist via /api/settings/* (org-scoped).
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
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
  Alert,
  Badge,
  EmptyState,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { AppPageHeader } from '@/components/app';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

type SettingsSection =
  | 'business'
  | 'branding'
  | 'services'
  | 'pricing'
  | 'notifications'
  | 'tiers'
  | 'ai'
  | 'integrations'
  | 'advanced';

const SECTION_IDS: SettingsSection[] = [
  'business',
  'branding',
  'services',
  'pricing',
  'notifications',
  'tiers',
  'ai',
  'integrations',
  'advanced',
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const isMobile = useMobile();
  const sectionParam = searchParams?.get('section') as SettingsSection | null;
  const [activeTab, setActiveTab] = useState<SettingsSection>(
    sectionParam && SECTION_IDS.includes(sectionParam) ? sectionParam : 'business'
  );

  useEffect(() => {
    if (sectionParam && SECTION_IDS.includes(sectionParam)) {
      setActiveTab(sectionParam);
    }
  }, [sectionParam]);

  return (
    <AppShell>
      <AppPageHeader
        title="Settings"
        subtitle="Business, services, pricing, notifications, and advanced configuration"
      />
      {isMobile ? (
        <>
          <MobileFilterBar
            activeFilter={activeTab}
            onFilterChange={(id) => setActiveTab(id as SettingsSection)}
            sticky
            options={SECTION_IDS.map((id) => ({
              id,
              label: sectionLabel(id),
            }))}
          />
          <SectionContent section={activeTab} />
        </>
      ) : (
        <Tabs
          tabs={SECTION_IDS.map((id) => ({
            id,
            label: sectionLabel(id),
            icon: sectionIcon(id),
          }))}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as SettingsSection)}
        >
          {SECTION_IDS.map((id) => (
            <TabPanel key={id} id={id}>
              <SectionContent section={id} />
            </TabPanel>
          ))}
        </Tabs>
      )}
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<AppShell><AppPageHeader title="Settings" subtitle="Loading…" /><Card><Skeleton height={400} /></Card></AppShell>}>
      <SettingsContent />
    </Suspense>
  );
}

function sectionLabel(id: SettingsSection): string {
  const labels: Record<SettingsSection, string> = {
    business: 'Business',
    branding: 'Branding',
    services: 'Services',
    pricing: 'Pricing',
    notifications: 'Notifications',
    tiers: 'Tiers',
    ai: 'AI',
    integrations: 'Integrations',
    advanced: 'Advanced',
  };
  return labels[id];
}

function sectionIcon(id: SettingsSection): React.ReactNode {
  const icons: Record<SettingsSection, string> = {
    business: 'fa-building',
    branding: 'fa-palette',
    services: 'fa-concierge-bell',
    pricing: 'fa-tag',
    notifications: 'fa-bell',
    tiers: 'fa-layer-group',
    ai: 'fa-robot',
    integrations: 'fa-plug',
    advanced: 'fa-sliders-h',
  };
  return <i className={`fas ${icons[id]}`} />;
}

function SectionContent({ section }: { section: SettingsSection }) {
  switch (section) {
    case 'business':
      return <BusinessSection />;
    case 'branding':
      return <BrandingSection />;
    case 'services':
      return <ServicesSection />;
    case 'pricing':
      return <PricingSection />;
    case 'notifications':
      return <NotificationsSection />;
    case 'tiers':
      return <TiersSection />;
    case 'ai':
      return <AISection />;
    case 'integrations':
      return <IntegrationsSection />;
    case 'advanced':
      return <AdvancedSection />;
    default:
      return null;
  }
}

function BusinessSection() {
  const queryClient = useQueryClient();
  const [data, setData] = useState({
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    timeZone: 'America/New_York',
  });
  const [success, setSuccess] = useState(false);

  const { isLoading, error: queryError } = useQuery({
    queryKey: ['owner', 'settings', 'business'],
    queryFn: async () => {
      const res = await fetch('/api/settings/business');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      const s = json.settings ?? {};
      const parsed = {
        businessName: s.businessName ?? '',
        businessPhone: s.businessPhone ?? '',
        businessEmail: s.businessEmail ?? '',
        businessAddress: s.businessAddress ?? '',
        timeZone: s.timeZone ?? 'America/New_York',
      };
      setData(parsed);
      return parsed;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof data) => {
      const res = await fetch('/api/settings/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'settings', 'business'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <Skeleton height={320} />
      </Card>
    );
  }

  return (
    <Card>
      <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
        Business Information
      </h3>
      {(queryError?.message || saveMutation.error?.message) && (
        <Alert variant="error" style={{ marginBottom: tokens.spacing[4] }}>
          {queryError?.message || saveMutation.error?.message}
        </Alert>
      )}
      {success && (
        <Alert variant="success" style={{ marginBottom: tokens.spacing[4] }}>
          Saved.
        </Alert>
      )}
      <FormRow label="Business Name" required>
        <Input
          value={data.businessName}
          onChange={(e) => setData((p) => ({ ...p, businessName: e.target.value }))}
        />
      </FormRow>
      <FormRow label="Business Phone">
        <Input
          type="tel"
          value={data.businessPhone}
          onChange={(e) => setData((p) => ({ ...p, businessPhone: e.target.value }))}
        />
      </FormRow>
      <FormRow label="Business Email">
        <Input
          type="email"
          value={data.businessEmail}
          onChange={(e) => setData((p) => ({ ...p, businessEmail: e.target.value }))}
        />
      </FormRow>
      <FormRow label="Business Address">
        <Input
          value={data.businessAddress}
          onChange={(e) => setData((p) => ({ ...p, businessAddress: e.target.value }))}
        />
      </FormRow>
      <FormRow label="Time zone">
        <Select
          value={data.timeZone}
          onChange={(e) => setData((p) => ({ ...p, timeZone: e.target.value }))}
          options={[
            { value: 'America/New_York', label: 'Eastern' },
            { value: 'America/Chicago', label: 'Central' },
            { value: 'America/Denver', label: 'Mountain' },
            { value: 'America/Los_Angeles', label: 'Pacific' },
          ]}
        />
      </FormRow>
      <div style={{ marginTop: tokens.spacing[6] }}>
        <Button variant="primary" onClick={() => saveMutation.mutate(data)} isLoading={saveMutation.isPending}>
          Save business settings
        </Button>
      </div>
    </Card>
  );
}

function ServicesSection() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: list = [], isLoading, error: queryError } = useQuery({
    queryKey: ['owner', 'settings', 'services'],
    queryFn: async () => {
      const res = await fetch('/api/settings/services');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      return (json.configs ?? []) as { id: string; serviceName: string; enabled: boolean }[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/services/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'settings', 'services'] });
    },
  });

  const deleteOne = (id: string) => {
    if (!confirm('Delete this service?')) return;
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Card>
        <Skeleton height={200} />
      </Card>
    );
  }

  return (
    <Card>
      <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
        Service catalog
      </h3>
      {(queryError?.message || deleteMutation.error?.message) && (
        <Alert variant="error" style={{ marginBottom: tokens.spacing[4] }}>
          {queryError?.message || deleteMutation.error?.message}
        </Alert>
      )}
      {list.length === 0 ? (
        <EmptyState
          title="No services"
          description="Add services to define what you offer (e.g. dog walking, drop-in visits)."
          action={{ label: 'Add service', onClick: () => router.push('/settings?section=services') }}
        />
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {list.map((s) => (
            <li
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: tokens.spacing[3],
                borderBottom: `1px solid ${tokens.colors.border.default}`,
              }}
            >
              <span>{s.serviceName}</span>
              <Flex align="center" gap={3}>
                <Badge variant={s.enabled ? 'success' : 'neutral'}>{s.enabled ? 'On' : 'Off'}</Badge>
                <Button variant="secondary" size="sm" onClick={() => deleteOne(s.id)}>
                  Delete
                </Button>
              </Flex>
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: tokens.spacing[4], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
        Create and edit services via the API or a future form. List loads from <code>/api/settings/services</code>.
      </p>
    </Card>
  );
}

function PricingSection() {
  const queryClient = useQueryClient();

  const { data: pricingData, isLoading, error: queryError } = useQuery({
    queryKey: ['owner', 'settings', 'pricing'],
    queryFn: async () => {
      const [rulesRes, discountsRes] = await Promise.all([
        fetch('/api/settings/pricing'),
        fetch('/api/settings/discounts'),
      ]);
      if (!rulesRes.ok) throw new Error('Failed to load pricing');
      if (!discountsRes.ok) throw new Error('Failed to load discounts');
      const rulesJson = await rulesRes.json();
      const discountsJson = await discountsRes.json();
      return {
        rules: (rulesJson.rules ?? []) as { id: string; name: string; type: string; enabled: boolean }[],
        discounts: (discountsJson.discounts ?? []) as { id: string; name: string; code: string | null; type: string; value: number; valueType: string; enabled: boolean }[],
      };
    },
  });

  const rules = pricingData?.rules ?? [];
  const discounts = pricingData?.discounts ?? [];

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/pricing/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'settings', 'pricing'] });
    },
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/discounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'settings', 'pricing'] });
    },
  });

  const deleteRule = (id: string) => {
    if (!confirm('Delete this pricing rule?')) return;
    deleteRuleMutation.mutate(id);
  };

  const deleteDiscount = (id: string) => {
    if (!confirm('Delete this discount?')) return;
    deleteDiscountMutation.mutate(id);
  };

  const mutationError = deleteRuleMutation.error?.message || deleteDiscountMutation.error?.message;

  if (isLoading) {
    return (
      <Card>
        <Skeleton height={200} />
      </Card>
    );
  }

  return (
    <Card>
      <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
        Pricing rules
      </h3>
      {(queryError?.message || mutationError) && (
        <Alert variant="error" style={{ marginBottom: tokens.spacing[4] }}>
          {queryError?.message || mutationError}
        </Alert>
      )}
      {rules.length === 0 ? (
        <EmptyState
          title="No pricing rules"
          description="Pricing rules define fees, discounts, or multipliers. Add rules via API or future UI."
        />
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rules.map((r) => (
            <li
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: tokens.spacing[3],
                borderBottom: `1px solid ${tokens.colors.border.default}`,
              }}
            >
              <span>{r.name}</span>
              <Flex align="center" gap={3}>
                <Badge variant="neutral">{r.type}</Badge>
                <Badge variant={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'On' : 'Off'}</Badge>
                <Button variant="secondary" size="sm" onClick={() => deleteRule(r.id)}>
                  Delete
                </Button>
              </Flex>
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ marginTop: tokens.spacing[8], marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
        Discounts
      </h3>
      {discounts.length === 0 ? (
        <EmptyState
          title="No discounts"
          description="Discount codes and automatic discounts. Add via API or future UI."
        />
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {discounts.map((d) => (
            <li
              key={d.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: tokens.spacing[3],
                borderBottom: `1px solid ${tokens.colors.border.default}`,
              }}
            >
              <span>
                {d.name}
                {d.code && (
                  <Badge variant="neutral" style={{ marginLeft: tokens.spacing[2] }}>
                    {d.code}
                  </Badge>
                )}
              </span>
              <Flex align="center" gap={3}>
                <Badge variant="neutral">{d.type}</Badge>
                <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                  {d.value}
                  {d.valueType === 'percentage' ? '%' : ' fixed'}
                </span>
                <Badge variant={d.enabled ? 'success' : 'neutral'}>{d.enabled ? 'On' : 'Off'}</Badge>
                <Button variant="secondary" size="sm" onClick={() => deleteDiscount(d.id)}>
                  Delete
                </Button>
              </Flex>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NotificationsSection() {
  const queryClient = useQueryClient();
  const [data, setData] = useState({
    smsEnabled: true,
    emailEnabled: false,
    ownerAlerts: true,
    sitterNotifications: true,
    clientReminders: true,
    paymentReminders: true,
    conflictNoticeEnabled: true,
    reminderTiming: '24h',
  });
  const [success, setSuccess] = useState(false);

  const { isLoading, error: queryError } = useQuery({
    queryKey: ['owner', 'settings', 'notifications'],
    queryFn: async () => {
      const res = await fetch('/api/settings/notifications');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      const s = json.settings ?? {};
      const parsed = {
        smsEnabled: s.smsEnabled !== false,
        emailEnabled: s.emailEnabled === true,
        ownerAlerts: s.ownerAlerts !== false,
        sitterNotifications: s.sitterNotifications !== false,
        clientReminders: s.clientReminders !== false,
        paymentReminders: s.paymentReminders !== false,
        conflictNoticeEnabled: s.conflictNoticeEnabled !== false,
        reminderTiming: s.reminderTiming ?? '24h',
      };
      setData(parsed);
      return parsed;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof data) => {
      const res = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'settings', 'notifications'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <Skeleton height={320} />
      </Card>
    );
  }

  return (
    <Card>
      <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
        Notification preferences
      </h3>
      {(queryError?.message || saveMutation.error?.message) && (
        <Alert variant="error" style={{ marginBottom: tokens.spacing[4] }}>
          {queryError?.message || saveMutation.error?.message}
        </Alert>
      )}
      {success && (
        <Alert variant="success" style={{ marginBottom: tokens.spacing[4] }}>
          Saved.
        </Alert>
      )}
      <FormRow>
        <label style={{ cursor: 'pointer' }}>
          <Flex align="center" gap={3}>
            <input
              type="checkbox"
              checked={data.smsEnabled}
              onChange={(e) => setData((p) => ({ ...p, smsEnabled: e.target.checked }))}
            />
            <span>SMS notifications</span>
          </Flex>
        </label>
      </FormRow>
      <FormRow>
        <label style={{ cursor: 'pointer' }}>
          <Flex align="center" gap={3}>
            <input
              type="checkbox"
              checked={data.emailEnabled}
              onChange={(e) => setData((p) => ({ ...p, emailEnabled: e.target.checked }))}
            />
            <span>Email notifications</span>
          </Flex>
        </label>
      </FormRow>
      <FormRow>
        <label style={{ cursor: 'pointer' }}>
          <Flex align="center" gap={3}>
            <input
              type="checkbox"
              checked={data.ownerAlerts}
              onChange={(e) => setData((p) => ({ ...p, ownerAlerts: e.target.checked }))}
            />
            <span>Owner alerts</span>
          </Flex>
        </label>
      </FormRow>
      <FormRow>
        <label style={{ cursor: 'pointer' }}>
          <Flex align="center" gap={3}>
            <input
              type="checkbox"
              checked={data.sitterNotifications}
              onChange={(e) => setData((p) => ({ ...p, sitterNotifications: e.target.checked }))}
            />
            <span>Sitter notifications</span>
          </Flex>
        </label>
      </FormRow>
      <FormRow>
        <label style={{ cursor: 'pointer' }}>
          <Flex align="center" gap={3}>
            <input
              type="checkbox"
              checked={data.paymentReminders}
              onChange={(e) => setData((p) => ({ ...p, paymentReminders: e.target.checked }))}
            />
            <span>Payment reminders</span>
          </Flex>
        </label>
      </FormRow>
      <FormRow label="Reminder timing">
        <Select
          value={data.reminderTiming}
          onChange={(e) => setData((p) => ({ ...p, reminderTiming: e.target.value }))}
          options={[
            { value: '24h', label: '24 hours before' },
            { value: '12h', label: '12 hours before' },
            { value: '6h', label: '6 hours before' },
            { value: '1h', label: '1 hour before' },
          ]}
        />
      </FormRow>
      <div style={{ marginTop: tokens.spacing[6] }}>
        <Button variant="primary" onClick={() => saveMutation.mutate(data)} isLoading={saveMutation.isPending}>
          Save notification settings
        </Button>
      </div>
    </Card>
  );
}

function TiersSection() {
  return (
    <Card>
      <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
        Policy tiers
      </h3>
      <p style={{ marginBottom: tokens.spacing[4], color: tokens.colors.text.secondary }}>
        Manage sitter tiers, point targets, and tier benefits. Tiers are org-scoped and fully persisted.
      </p>
      <Link href="/settings/tiers">
        <Button variant="primary" leftIcon={<i className="fas fa-layer-group" />}>
          Open tier settings
        </Button>
      </Link>
      <p style={{ marginTop: tokens.spacing[3], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
        <Link href="/settings/tiers/new">Create new tier</Link>
      </p>
    </Card>
  );
}

function AISection() {
  return (
    <Card>
      <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
        AI governance
      </h3>
      <p style={{ marginBottom: tokens.spacing[4], color: tokens.colors.text.secondary }}>
        Enable/disable AI, set budgets, and manage prompt templates. AI settings are org-scoped.
      </p>
      <Link href="/ops/ai">
        <Button variant="primary" leftIcon={<i className="fas fa-robot" />}>
          Open AI settings
        </Button>
      </Link>
    </Card>
  );
}

function IntegrationsSection() {
  return (
    <Card>
      <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
        Integrations
      </h3>
      <p style={{ marginBottom: tokens.spacing[4], color: tokens.colors.text.secondary }}>
        Stripe, messaging (Twilio), calendar, and other integrations are configured in the integrations hub.
      </p>
      <Link href="/integrations">
        <Button variant="primary" leftIcon={<i className="fas fa-plug" />}>
          Open integrations
        </Button>
      </Link>
    </Card>
  );
}

function AdvancedSection() {
  const queryClient = useQueryClient();
  const [rotation, setRotation] = useState<Record<string, string | number>>({});

  const { isLoading: rotationLoading, error: rotationQueryError } = useQuery({
    queryKey: ['owner', 'settings', 'rotation'],
    queryFn: async () => {
      const res = await fetch('/api/settings/rotation');
      if (!res.ok) throw new Error('Failed to load rotation');
      const json = await res.json();
      setRotation(json);
      return json as Record<string, string | number>;
    },
  });

  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ['owner', 'settings', 'areas'],
    queryFn: async () => {
      const res = await fetch('/api/settings/service-areas');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      return (json.areas ?? []) as { id: string; name: string; type: string }[];
    },
  });

  const saveRotationMutation = useMutation({
    mutationFn: async (payload: Record<string, string | number>) => {
      const res = await fetch('/api/settings/rotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      const json = await res.json();
      setRotation(json);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'settings', 'rotation'] });
    },
  });

  const rotationError = rotationQueryError?.message || saveRotationMutation.error?.message;

  return (
    <>
      <Card style={{ marginBottom: tokens.spacing[6] }}>
        <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
          Rotation (pool number lifecycle)
        </h3>
        {rotationError && (
          <Alert variant="error" style={{ marginBottom: tokens.spacing[4] }}>
            {rotationError}
          </Alert>
        )}
        {rotationLoading ? (
          <Skeleton height={120} />
        ) : (
          <>
            <FormRow label="Pool selection strategy">
              <Select
                value={String(rotation.poolSelectionStrategy ?? 'LRU')}
                onChange={(e) =>
                  setRotation((p) => ({ ...p, poolSelectionStrategy: e.target.value }))
                }
                options={[
                  { value: 'LRU', label: 'Least Recently Used' },
                  { value: 'FIFO', label: 'First In First Out' },
                  { value: 'HASH_SHUFFLE', label: 'Hash Shuffle' },
                ]}
              />
            </FormRow>
            <FormRow label="Max concurrent threads per pool number">
              <Input
                type="number"
                min={1}
                value={String(rotation.maxConcurrentThreadsPerPoolNumber ?? 1)}
                onChange={(e) =>
                  setRotation((p) => ({
                    ...p,
                    maxConcurrentThreadsPerPoolNumber: parseInt(e.target.value, 10) || 1,
                  }))
                }
              />
            </FormRow>
            <div style={{ marginTop: tokens.spacing[4] }}>
              <Button variant="primary" onClick={() => saveRotationMutation.mutate(rotation)} isLoading={saveRotationMutation.isPending}>
                Save rotation settings
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card style={{ marginBottom: tokens.spacing[6] }}>
        <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
          Service areas
        </h3>
        {areasLoading ? (
          <Skeleton height={80} />
        ) : areas.length === 0 ? (
          <EmptyState
            title="No service areas"
            description="Define coverage zones (ZIPs, radius, or polygon). Add via API or future UI."
          />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {areas.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: tokens.spacing[3],
                  borderBottom: `1px solid ${tokens.colors.border.default}`,
                }}
              >
                {a.name} <Badge variant="neutral">{a.type}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
          Org config
        </h3>
        <p style={{ color: tokens.colors.text.secondary }}>
          Org metadata and feature flags are managed in the database. No editable controls here yet.
        </p>
      </Card>
    </>
  );
}

function BrandingSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    businessName: '',
    logoUrl: '',
    primaryColor: '#432f21',
    secondaryColor: '#fce1ef',
  });
  const [saved, setSaved] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['owner', 'settings', 'branding'],
    queryFn: async () => {
      const res = await fetch('/api/settings/branding');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setForm({
        businessName: data.businessName || '',
        logoUrl: data.logoUrl || '',
        primaryColor: data.primaryColor || '#432f21',
        secondaryColor: data.secondaryColor || '#fce1ef',
      });
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['owner', 'settings', 'branding'] });
    },
  });

  if (isLoading) return <Card><Skeleton height={200} /></Card>;

  return (
    <>
      <Card>
        <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
          Client-Facing Branding
        </h3>
        <p style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.sm[0] }}>
          Customize how your business appears to clients in the portal, emails, and native apps.
        </p>

        <FormRow label="Business Name" description="Replaces 'Snout OS' in all client-facing surfaces">
          <Input
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            placeholder="Your Business Name"
          />
        </FormRow>

        <FormRow label="Logo URL" description="Square image recommended (at least 200×200px)">
          <Input
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
          {form.logoUrl && (
            <div style={{ marginTop: tokens.spacing[2] }}>
              <img
                src={form.logoUrl}
                alt="Logo preview"
                style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'contain', border: `1px solid ${tokens.colors.border.default}` }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </FormRow>

        <FormRow label="Primary Color" description="Used for buttons, links, and accents">
          <Flex align="center" gap={2}>
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              style={{ width: 44, height: 44, border: 'none', cursor: 'pointer', borderRadius: 8 }}
            />
            <Input
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              style={{ width: 120 }}
              placeholder="#432f21"
            />
          </Flex>
        </FormRow>

        <FormRow label="Secondary Color" description="Used for backgrounds and highlights">
          <Flex align="center" gap={2}>
            <input
              type="color"
              value={form.secondaryColor}
              onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
              style={{ width: 44, height: 44, border: 'none', cursor: 'pointer', borderRadius: 8 }}
            />
            <Input
              value={form.secondaryColor}
              onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
              style={{ width: 120 }}
              placeholder="#fce1ef"
            />
          </Flex>
        </FormRow>

        <div style={{ marginTop: tokens.spacing[4] }}>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save Branding'}
          </Button>
          {saved && <Badge variant="success" style={{ marginLeft: tokens.spacing[2] }}>Saved</Badge>}
        </div>
      </Card>

      {/* Live preview */}
      <Card>
        <h3 style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.lg[0] }}>
          Preview
        </h3>
        <div style={{
          border: `1px solid ${tokens.colors.border.default}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            backgroundColor: form.primaryColor || '#432f21',
            padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[3],
          }}>
            {form.logoUrl && (
              <img src={form.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
              {form.businessName || 'Your Business'}
            </span>
          </div>
          <div style={{ padding: tokens.spacing[4], backgroundColor: form.secondaryColor || '#fef7fb' }}>
            <p style={{ color: '#333', fontSize: 14 }}>This is how clients will see your portal header.</p>
            <button style={{
              marginTop: tokens.spacing[3],
              backgroundColor: form.primaryColor || '#432f21',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              Book a Visit
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}
