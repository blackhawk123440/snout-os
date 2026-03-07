'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { OwnerAppShell, PageHeader } from '@/components/layout';
import { Badge, Button, Card, Skeleton, Switch } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

type IntegrationsSnapshot = {
  stripe: {
    ready: boolean;
    reachable: boolean;
    connectEnabled: boolean;
  };
  twilio: {
    ready: boolean;
    numbersConfigured: boolean;
    webhooksInstalled: boolean;
  };
  calendar: {
    ready: boolean;
    connectedSitters: number;
    lastSyncAt: string | null;
  };
  ai: {
    ready: boolean;
    enabled: boolean;
  };
};

export default function IntegrationsPage() {
  const [snapshot, setSnapshot] = useState<IntegrationsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/integrations/status');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'Failed to load integrations status');
      }
      setSnapshot(body);
    } catch (err: any) {
      setError(err?.message || 'Failed to load integrations');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const [stripeTestMessage, setStripeTestMessage] = useState<string | null>(null);

  async function runAction(key: string, request: () => Promise<Response>) {
    setBusy((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await request();
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || body.message || 'Action failed');
      }
      await loadSnapshot();
      if (body.message) {
        alert(body.message);
      }
    } catch (err: any) {
      alert(err?.message || 'Action failed');
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function runStripeTest() {
    setBusy((prev) => ({ ...prev, stripeTest: true }));
    setStripeTestMessage(null);
    try {
      const response = await fetch('/api/integrations/stripe/test', { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || 'Stripe test failed');
      }
      setStripeTestMessage(
        `connectivity=${body.connectivity ? 'ok' : 'fail'}, account=${body.accountReachable ? 'ok' : 'fail'}, transfers=${body.transfersEnabled ? 'enabled' : 'disabled'}`
      );
      await loadSnapshot();
    } catch (err: any) {
      setStripeTestMessage(err?.message || 'Stripe test failed');
    } finally {
      setBusy((prev) => ({ ...prev, stripeTest: false }));
    }
  }

  async function updateAiSettings(enabled: boolean) {
    setBusy((prev) => ({ ...prev, ai: true }));
    try {
      const response = await fetch('/api/ops/ai/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update AI settings');
      }
      await loadSnapshot();
    } catch (err: any) {
      alert(err?.message || 'Failed to update AI settings');
    } finally {
      setBusy((prev) => ({ ...prev, ai: false }));
    }
  }

  return (
    <OwnerAppShell>
      <PageHeader
        title="Integrations"
        subtitle="Canonical owner control center for Stripe, Twilio, Google Calendar, and AI/OpenAI."
        actions={<Button variant="secondary" onClick={loadSnapshot}>Refresh status</Button>}
      />

      <div style={{ padding: tokens.spacing[6], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        <Card>
          <div style={{ padding: tokens.spacing[4], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            Canonical route: <strong>/integrations</strong>. Legacy setup pages redirect here where appropriate.
          </div>
        </Card>

        {error && (
          <Card style={{ backgroundColor: tokens.colors.error[50], borderColor: tokens.colors.error[200] }}>
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>{error}</div>
          </Card>
        )}

        {loading ? (
          <Card><div style={{ padding: tokens.spacing[4] }}><Skeleton height={240} /></div></Card>
        ) : !snapshot ? (
          <Card><div style={{ padding: tokens.spacing[4] }}>No integrations snapshot available.</div></Card>
        ) : (
          <>
            <Card>
              <div style={{ padding: tokens.spacing[4], display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                <Badge variant={snapshot.stripe.ready ? 'success' : 'warning'}>Stripe: {snapshot.stripe.ready ? 'Ready' : 'Needs setup'}</Badge>
                <Badge variant={snapshot.twilio.ready ? 'success' : 'warning'}>Twilio: {snapshot.twilio.ready ? 'Ready' : 'Needs setup'}</Badge>
                <Badge variant={snapshot.calendar.ready ? 'success' : 'warning'}>Calendar: {snapshot.calendar.ready ? 'Ready' : 'Needs setup'}</Badge>
                <Badge variant={snapshot.ai.ready ? 'success' : 'warning'}>AI/OpenAI: {snapshot.ai.ready ? 'Ready' : 'Needs setup'}</Badge>
              </div>
            </Card>

            <Card>
              <div style={{ padding: tokens.spacing[4] }}>
                <h3 style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2] }}>Stripe</h3>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
                  <strong>Integration:</strong> Stripe
                </p>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[3] }}>
                  <strong>Status:</strong> {snapshot.stripe.ready ? 'Ready' : 'Needs setup'}
                </p>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[3] }}>
                  <strong>Key health indicator (transfers):</strong> {snapshot.stripe.connectEnabled ? 'Connect enabled' : 'Connect not enabled'} • {snapshot.stripe.reachable ? 'API reachable' : 'API unreachable'}
                </p>
                {stripeTestMessage && (
                  <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[3] }}>
                    Latest test: {stripeTestMessage}
                  </p>
                )}
                <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={runStripeTest} disabled={!!busy.stripeTest}>
                    {busy.stripeTest ? 'Testing...' : 'Test Stripe'}
                  </Button>
                  <Link href="/payroll"><Button variant="primary">Open Payroll</Button></Link>
                  <Link href="/ops/payouts"><Button variant="secondary">Open Payout Ops</Button></Link>
                  <Link href="/ops/finance/reconciliation"><Button variant="secondary">Open Reconciliation</Button></Link>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: tokens.spacing[4] }}>
                <h3 style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2] }}>Twilio</h3>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
                  <strong>Integration:</strong> Twilio
                </p>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
                  <strong>Status:</strong> {snapshot.twilio.ready ? 'Ready' : 'Needs setup'}
                </p>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[3] }}>
                  <strong>Key health indicator (numbers + webhooks):</strong> {snapshot.twilio.numbersConfigured ? 'Numbers configured' : 'Numbers missing'} • {snapshot.twilio.webhooksInstalled ? 'Webhooks installed' : 'Webhooks missing'}
                </p>
                <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                  <Button
                    variant="secondary"
                    onClick={() => runAction('twilio-test', () => fetch('/api/setup/provider/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }))}
                    disabled={!!busy['twilio-test']}
                  >
                    {busy['twilio-test'] ? 'Testing...' : 'Test Provider'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => runAction('twilio-sync', () => fetch('/api/setup/numbers/sync', { method: 'POST' }))}
                    disabled={!!busy['twilio-sync']}
                  >
                    {busy['twilio-sync'] ? 'Syncing...' : 'Sync Numbers'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => runAction('twilio-install', () => fetch('/api/setup/webhooks/install', { method: 'POST' }))}
                    disabled={!!busy['twilio-install']}
                  >
                    {busy['twilio-install'] ? 'Installing...' : 'Install Webhooks'}
                  </Button>
                  <Link href="/messaging/twilio-setup"><Button variant="primary">Open Twilio Setup</Button></Link>
                  <Link href="/messaging/numbers"><Button variant="secondary">Numbers</Button></Link>
                  <Link href="/messaging/assignments"><Button variant="secondary">Assignments</Button></Link>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: tokens.spacing[4] }}>
                <h3 style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2] }}>Calendar</h3>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
                  <strong>Integration:</strong> Google Calendar
                </p>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[3] }}>
                  <strong>Status:</strong> {snapshot.calendar.ready ? 'Ready' : 'Needs setup'}
                </p>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[3] }}>
                  <strong>Key health indicator (connected sitters):</strong> {snapshot.calendar.connectedSitters} • Last sync: {snapshot.calendar.lastSyncAt ? new Date(snapshot.calendar.lastSyncAt).toLocaleString() : 'Never'}
                </p>
                <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={loadSnapshot}>Check status</Button>
                  <Link href="/sitters"><Button variant="primary">Open Sitters</Button></Link>
                  <Link href="/ops/calendar-repair"><Button variant="secondary">Calendar Repair</Button></Link>
                  <Link href="/calendar"><Button variant="secondary">Owner Calendar</Button></Link>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: tokens.spacing[4] }}>
                <h3 style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2] }}>AI / OpenAI</h3>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
                  <strong>Integration:</strong> AI/OpenAI
                </p>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
                  <strong>Status:</strong> {snapshot.ai.ready ? 'Ready' : 'Needs setup'}
                </p>
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[3] }}>
                  <strong>Key health indicator (enabled):</strong> {snapshot.ai.enabled ? 'Enabled' : 'Disabled'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[3] }}>
                  <Switch
                    checked={snapshot.ai.enabled}
                    onChange={updateAiSettings}
                    label="AI features enabled"
                    disabled={!!busy.ai}
                  />
                </div>
                <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={loadSnapshot}>Check status</Button>
                  <Link href="/ops/ai"><Button variant="primary">Open AI Ops</Button></Link>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </OwnerAppShell>
  );
}
