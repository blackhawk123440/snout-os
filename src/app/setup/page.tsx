/**
 * Setup Wizard Page
 * 
 * Full operational control for Twilio setup
 */

'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, Card, Button, Input, Badge, Skeleton } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import {
  useProviderStatus,
  useTestConnection,
  useConnectProvider,
  useNumbersStatus,
  useWebhookStatus,
  useInstallWebhooks,
  useLastWebhookReceived,
  useReadiness,
} from '@/lib/api/setup-hooks';

export default function SetupPage() {
  const { isOwner, loading: authLoading } = useAuth();
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const providerStatus = useProviderStatus();
  const testConnection = useTestConnection();
  const connectProvider = useConnectProvider();
  const numbersStatus = useNumbersStatus();
  const webhookStatus = useWebhookStatus();
  const installWebhooks = useInstallWebhooks();
  const lastWebhook = useLastWebhookReceived();
  const readiness = useReadiness();

  if (authLoading) {
    return (
      <AppShell>
        <PageHeader title="Setup" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  if (!isOwner) {
    return (
      <AppShell>
        <PageHeader title="Setup" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Card>
            <p>Access denied. Owner access required.</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  const handleTestConnection = async () => {
    setConnectionError(null);
    try {
      const result = await testConnection.mutateAsync({
        accountSid: accountSid || undefined,
        authToken: authToken || undefined,
      });

      if (result.success) {
        setConnectionTested(true);
        setConnectionError(null);
      } else {
        setConnectionTested(false);
        setConnectionError(result.error || 'Connection test failed');
      }
    } catch (error: any) {
      setConnectionTested(false);
      setConnectionError(error.message || 'Connection test failed');
    }
  };

  const handleConnectProvider = async () => {
    if (!accountSid || !authToken) {
      setConnectionError('Please enter both Account SID and Auth Token');
      return;
    }

    try {
      await connectProvider.mutateAsync({ accountSid, authToken });
      setConnectionTested(true);
      setConnectionError(null);
    } catch (error: any) {
      setConnectionError(error.message || 'Failed to connect provider');
    }
  };

  const handleInstallWebhooks = async () => {
    try {
      await installWebhooks.mutateAsync();
    } catch (error: any) {
      alert(`Failed to install webhooks: ${error.message}`);
    }
  };

  const formatLastReceived = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute(s) ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour(s) ago`;
    return date.toLocaleString();
  };

  return (
    <AppShell>
      <PageHeader
        title="Messaging Setup"
        description="Configure your Twilio connection and verify system readiness"
      />
      <div style={{ padding: tokens.spacing[6], maxWidth: '800px', margin: '0 auto' }}>
        {/* Provider Connection */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <h2 style={{ fontSize: tokens.typography.fontSize.xl[0], marginBottom: tokens.spacing[4] }}>
            Step 1: Connect Provider
          </h2>
          <p style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[4] }}>
            Enter your Twilio credentials to connect your messaging account.
          </p>

          <div style={{ marginBottom: tokens.spacing[4] }}>
            <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
              Account SID
            </label>
            <Input
              type="text"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div style={{ marginBottom: tokens.spacing[4] }}>
            <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
              Auth Token
            </label>
            <Input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Enter your auth token"
            />
          </div>

          {connectionError && (
            <div style={{ 
              padding: tokens.spacing[3], 
              backgroundColor: tokens.colors.error[50], 
              border: `1px solid ${tokens.colors.error[200]}`,
              borderRadius: tokens.borderRadius.md,
              marginBottom: tokens.spacing[4],
            }}>
              <p style={{ color: tokens.colors.error[700], fontSize: tokens.typography.fontSize.sm[0] }}>
                {connectionError}
              </p>
            </div>
          )}

          {connectionTested && !connectionError && (
            <div style={{ 
              padding: tokens.spacing[3], 
              backgroundColor: tokens.colors.success[50], 
              border: `1px solid ${tokens.colors.success[200]}`,
              borderRadius: tokens.borderRadius.md,
              marginBottom: tokens.spacing[4],
            }}>
              <p style={{ color: tokens.colors.success[700], fontSize: tokens.typography.fontSize.sm[0] }}>
                ✓ Connection successful
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: tokens.spacing[3] }}>
            <Button
              onClick={handleTestConnection}
              disabled={testConnection.isPending}
              variant="secondary"
            >
              {testConnection.isPending ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              onClick={handleConnectProvider}
              disabled={!connectionTested || connectProvider.isPending || !accountSid || !authToken}
              variant="primary"
            >
              {connectProvider.isPending ? 'Connecting...' : 'Connect & Save'}
            </Button>
          </div>
        </Card>

        {/* Provider Status */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <h2 style={{ fontSize: tokens.typography.fontSize.xl[0], marginBottom: tokens.spacing[4] }}>
            Provider Status
          </h2>
          {providerStatus.isLoading ? (
            <Skeleton height={100} />
          ) : (
            <div>
              <p>
                Status: <Badge variant={providerStatus.data?.connected ? 'success' : 'error'}>
                  {providerStatus.data?.connected ? 'Connected' : 'Not Connected'}
                </Badge>
              </p>
              {providerStatus.data?.accountSid && (
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
                  Account: {providerStatus.data.accountSid}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Numbers Status */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <h2 style={{ fontSize: tokens.typography.fontSize.xl[0], marginBottom: tokens.spacing[4] }}>
            Numbers Status
          </h2>
          {numbersStatus.isLoading ? (
            <Skeleton height={100} />
          ) : (
            <div>
              <p>
                Front Desk: <Badge variant={numbersStatus.data?.hasFrontDesk ? 'success' : 'error'}>
                  {numbersStatus.data?.hasFrontDesk ? `${numbersStatus.data.frontDesk.count} number(s)` : 'Not configured'}
                </Badge>
              </p>
              <p>
                Pool Numbers: <Badge>{numbersStatus.data?.pool.count || 0} number(s)</Badge>
              </p>
              <p>
                Sitter Numbers: <Badge>{numbersStatus.data?.sitter.count || 0} number(s)</Badge>
              </p>
            </div>
          )}
        </Card>

        {/* Webhook Status */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <h2 style={{ fontSize: tokens.typography.fontSize.xl[0], marginBottom: tokens.spacing[4] }}>
            Webhook Status
          </h2>
          {webhookStatus.isLoading ? (
            <Skeleton height={100} />
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[3] }}>
                <p>
                  Status: <Badge variant={webhookStatus.data?.verified ? 'success' : 'error'}>
                    {webhookStatus.data?.verified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </p>
                {!webhookStatus.data?.verified && (
                  <Button
                    onClick={handleInstallWebhooks}
                    disabled={installWebhooks.isPending}
                    variant="primary"
                    size="sm"
                  >
                    {installWebhooks.isPending ? 'Installing...' : 'Install Webhooks'}
                  </Button>
                )}
              </div>
              {webhookStatus.data?.webhookUrl && (
                <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0], wordBreak: 'break-all', marginBottom: tokens.spacing[2] }}>
                  URL: {webhookStatus.data.webhookUrl}
                </p>
              )}
              {lastWebhook.data && (
                <div style={{ marginTop: tokens.spacing[3] }}>
                  <p style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
                    <strong>Last webhook received:</strong> {formatLastReceived(lastWebhook.data.lastReceivedAt)}
                  </p>
                  <p style={{ fontSize: tokens.typography.fontSize.sm[0], marginTop: tokens.spacing[1] }}>
                    <strong>Receiving:</strong>{' '}
                    <Badge variant={lastWebhook.data.receiving ? 'success' : 'error'}>
                      {lastWebhook.data.receiving ? '✓ Active' : '✗ Not receiving'}
                    </Badge>
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* System Readiness */}
        <Card>
          <h2 style={{ fontSize: tokens.typography.fontSize.xl[0], marginBottom: tokens.spacing[4] }}>
            System Readiness
          </h2>
          {readiness.isLoading ? (
            <Skeleton height={200} />
          ) : (
            <div>
              <p style={{ marginBottom: tokens.spacing[4] }}>
                Overall Status: <Badge variant={readiness.data?.ready ? 'success' : 'error'}>
                  {readiness.data?.ready ? 'Ready' : 'Not Ready'}
                </Badge>
              </p>
              {readiness.data?.checks.map((check, idx) => (
                <div key={idx} style={{ 
                  padding: tokens.spacing[3], 
                  backgroundColor: check.passed ? tokens.colors.success[50] : tokens.colors.error[50],
                  borderRadius: tokens.borderRadius.md,
                  marginBottom: tokens.spacing[2],
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                    <span>{check.passed ? '✓' : '✗'}</span>
                    <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>{check.name}</span>
                  </div>
                  {check.error && (
                    <p style={{ color: tokens.colors.error[700], fontSize: tokens.typography.fontSize.sm[0], marginTop: tokens.spacing[1] }}>
                      {check.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
