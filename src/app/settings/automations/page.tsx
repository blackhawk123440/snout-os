'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Skeleton,
} from '@/components/ui';
import { Switch } from '@/components/ui/Switch';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface AutomationItem {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  sendToClient: boolean;
  sendToSitter: boolean;
  sendToOwner: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  booking: 'fa-calendar-check',
  reminder: 'fa-clock',
  payment: 'fa-credit-card',
  notification: 'fa-bell',
  review: 'fa-star',
};

const CATEGORY_LABELS: Record<string, string> = {
  booking: 'Booking',
  reminder: 'Reminder',
  payment: 'Payment',
  notification: 'Notification',
  review: 'Review',
};

export default function AutomationSettingsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: automationsData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['owner', 'automations'],
    queryFn: async () => {
      const res = await fetch('/api/automations');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      return json.items || [];
    },
  });
  const automations = automationsData || [];

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch('/api/automations/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [id]: { enabled } }),
      });
      if (!res.ok) throw new Error('Failed to update');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'automations'] });
    },
    onError: () => {
      setError('Failed to save. Please try again.');
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/automations/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingConfirmation: { enabled: true },
          nightBeforeReminder: { enabled: true },
          paymentReminder: { enabled: true },
          sitterAssignment: { enabled: true },
          postVisitThankYou: { enabled: true },
          ownerNewBookingAlert: { enabled: true },
        }),
      });
      if (!res.ok) throw new Error('Failed to reset');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'automations'] });
    },
    onError: () => {
      setError('Failed to reset. Please try again.');
    },
  });

  const saving = toggleMutation.isPending ? (toggleMutation.variables?.id ?? null) : resetMutation.isPending ? 'reset' : null;

  return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <PageHeader
          title="Automations"
          description="Configure automatic messages and actions"
        />

        {(error || queryError) && (
          <Card style={{ backgroundColor: tokens.colors.error[50], padding: tokens.spacing[3], marginBottom: tokens.spacing[4] }}>
            <div style={{ color: tokens.colors.error.DEFAULT, fontSize: tokens.typography.fontSize.sm[0] }}>
              {error || (queryError as Error)?.message || 'Failed to load automations'}
              <Button variant="ghost" size="sm" onClick={() => setError(null)} style={{ marginLeft: tokens.spacing[2] }}>
                Dismiss
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} style={{ height: 80, borderRadius: tokens.borderRadius.lg }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
            {automations.map((automation: AutomationItem) => (
              <Card key={automation.id} style={{ padding: tokens.spacing[4] }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[1] }}>
                      <i className={`fas ${CATEGORY_ICONS[automation.category] || 'fa-bolt'}`} style={{ color: tokens.colors.primary.DEFAULT, fontSize: 14 }} />
                      <span style={{ fontWeight: 600, fontSize: tokens.typography.fontSize.base[0] }}>
                        {automation.name}
                      </span>
                      <Badge variant={automation.enabled ? 'success' : 'default'}>
                        {automation.enabled ? 'Active' : 'Off'}
                      </Badge>
                    </div>
                    <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, margin: 0 }}>
                      {automation.description}
                    </p>
                    <div style={{ display: 'flex', gap: tokens.spacing[2], marginTop: tokens.spacing[2], flexWrap: 'wrap' }}>
                      {automation.sendToClient && (
                        <Badge variant="default">Client</Badge>
                      )}
                      {automation.sendToSitter && (
                        <Badge variant="default">Sitter</Badge>
                      )}
                      {automation.sendToOwner && (
                        <Badge variant="default">Owner</Badge>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <Switch
                      checked={automation.enabled}
                      onChange={(checked) => toggleMutation.mutate({ id: automation.id, enabled: checked })}
                      disabled={saving === automation.id}
                      aria-label={`Toggle ${automation.name}`}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: tokens.spacing[6], gap: tokens.spacing[3], flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => resetMutation.mutate()}
            disabled={saving === 'reset'}
          >
            {saving === 'reset' ? 'Resetting...' : 'Reset to defaults'}
          </Button>
          <Link href="/settings/automations/history">
            <Button variant="ghost">
              <i className="fas fa-history" style={{ marginRight: tokens.spacing[2] }} />
              View run history
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
