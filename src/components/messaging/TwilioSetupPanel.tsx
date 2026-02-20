/**
 * Twilio Setup Panel - Embedded in Messages tab
 * 
 * Owner can save credentials, test connection, install webhooks, check readiness
 */

'use client';

import { useState } from 'react';
import { Card, Button, Badge, EmptyState, Skeleton, Modal, Input } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import { z } from 'zod';

const providerStatusSchema = z.object({
  connected: z.boolean(),
  accountSid: z.string().nullable(),
  hasAuthToken: z.boolean(),
  lastTestedAt: z.string().nullable(),
  testResult: z.object({
    success: z.boolean(),
    message: z.string(),
  }).nullable(),
});

const webhookStatusSchema = z.object({
  installed: z.boolean(),
  url: z.string().nullable(),
  lastReceivedAt: z.string().nullable(),
  status: z.string(),
});

const readinessSchema = z.object({
  provider: z.object({ ready: z.boolean(), message: z.string() }),
  numbers: z.object({ ready: z.boolean(), message: z.string() }),
  webhooks: z.object({ ready: z.boolean(), message: z.string() }),
  overall: z.boolean(),
});

function useProviderStatus() {
  return useQuery({
    queryKey: ['setup', 'provider', 'status'],
    queryFn: () => apiGet('/api/setup/provider/status', providerStatusSchema),
  });
}

function useWebhookStatus() {
  return useQuery({
    queryKey: ['setup', 'webhooks', 'status'],
    queryFn: () => apiGet('/api/setup/webhooks/status', webhookStatusSchema),
  });
}

function useReadiness() {
  return useQuery({
    queryKey: ['setup', 'readiness'],
    queryFn: () => apiGet('/api/setup/readiness', readinessSchema),
  });
}

function useTestConnection() {
  return useMutation({
    mutationFn: (params: { accountSid?: string; authToken?: string }) =>
      apiPost('/api/setup/provider/test', params, z.object({
        success: z.boolean(),
        message: z.string(),
      })),
  });
}

function useConnectProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { accountSid: string; authToken: string }) =>
      apiPost('/api/setup/provider/connect', params, z.object({
        success: z.boolean(),
        message: z.string(),
      })),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] });
      // Re-fetch provider status immediately
      await queryClient.refetchQueries({ queryKey: ['setup', 'provider', 'status'] });
    },
  });
}

function useInstallWebhooks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost('/api/setup/webhooks/install', {}, z.object({
      success: z.boolean(),
      message: z.string(),
      url: z.string().nullable(),
    })),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] });
      // Re-fetch webhook status immediately
      await queryClient.refetchQueries({ queryKey: ['setup', 'webhooks', 'status'] });
    },
  });
}

function useTestSMS() {
  return useMutation({
    mutationFn: (params: { destinationE164: string; fromClass: 'front_desk' | 'pool' | 'sitter' }) =>
      apiPost('/api/setup/test-sms', params, z.object({
        success: z.boolean(),
        messageSid: z.string().nullable(),
        error: z.string().nullable(),
        errorCode: z.string().nullable(),
        fromE164: z.string().nullable(),
      })),
  });
}

export function TwilioSetupPanel() {
  const { data: providerStatus, isLoading: providerLoading } = useProviderStatus();
  const { data: webhookStatus, isLoading: webhookLoading } = useWebhookStatus();
  const { data: readiness, isLoading: readinessLoading } = useReadiness();
  
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectForm, setConnectForm] = useState({ accountSid: '', authToken: '' });
  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState({ accountSid: '', authToken: '' });
  const [showTestSMSModal, setShowTestSMSModal] = useState(false);
  const [testSMSForm, setTestSMSForm] = useState({ destinationE164: '', fromClass: 'front_desk' as 'front_desk' | 'pool' | 'sitter' });

  const testConnection = useTestConnection();
  const connectProvider = useConnectProvider();
  const installWebhooks = useInstallWebhooks();
  const testSMS = useTestSMS();

  const handleTest = async () => {
    try {
      const result = await testConnection.mutateAsync({
        accountSid: testForm.accountSid || undefined,
        authToken: testForm.authToken || undefined,
      });
      alert(result.message || (result.success ? 'Connection test successful' : 'Connection test failed'));
    } catch (error: any) {
      alert(`Test failed: ${error.message}`);
    }
  };

  const handleConnect = async () => {
    if (!connectForm.accountSid || !connectForm.authToken) {
      alert('Please enter both Account SID and Auth Token');
      return;
    }

    try {
      await connectProvider.mutateAsync(connectForm);
      setShowConnectModal(false);
      setConnectForm({ accountSid: '', authToken: '' });
      alert('Provider credentials saved successfully');
    } catch (error: any) {
      alert(`Failed to save credentials: ${error.message}`);
    }
  };

  const handleInstallWebhooks = async () => {
    try {
      const result = await installWebhooks.mutateAsync();
      alert(result.message || 'Webhooks installed successfully');
    } catch (error: any) {
      alert(`Failed to install webhooks: ${error.message}`);
    }
  };

  if (providerLoading || webhookLoading || readinessLoading) {
    return <Skeleton height={400} />;
  }

  return (
    <div>
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <h2 style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[1] }}>
          Twilio Setup
        </h2>
        <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
          Save credentials, test connection, install webhooks, and check readiness
        </p>
      </div>

      {/* Provider Status */}
      <Card style={{ marginBottom: tokens.spacing[4] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[3] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
            Provider Connection
          </h3>
          <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTestModal(true)}
            >
              Test Connection
            </Button>
            <Button
              variant={providerStatus?.connected ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setShowConnectModal(true)}
            >
              {providerStatus?.connected ? 'Update Credentials' : 'Connect Provider'}
            </Button>
          </div>
        </div>

        {providerStatus?.connected ? (
          <div>
            <Badge variant="success" style={{ marginBottom: tokens.spacing[2] }}>
              Connected ✓
            </Badge>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
              <div>Account SID: {providerStatus.accountSid || 'Not set'}</div>
              {providerStatus.lastTestedAt && (
                <div>Last tested: {new Date(providerStatus.lastTestedAt).toLocaleString()}</div>
              )}
              {providerStatus.testResult && (
                <div>
                  Test result: <Badge variant={providerStatus.testResult.success ? 'success' : 'error'}>
                    {providerStatus.testResult.message}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <Badge variant="error">Not Connected</Badge>
            <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[2] }}>
              Connect your Twilio account to enable messaging
            </p>
          </div>
        )}
      </Card>

      {/* Webhook Status */}
      <Card style={{ marginBottom: tokens.spacing[4] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[3] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
            Webhooks
          </h3>
          <Button
            variant={webhookStatus?.installed ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleInstallWebhooks}
            disabled={installWebhooks.isPending}
          >
            {installWebhooks.isPending ? 'Installing...' : webhookStatus?.installed ? 'Reinstall' : 'Install Webhooks'}
          </Button>
        </div>

        {webhookStatus?.installed ? (
          <div>
            <Badge variant="success" style={{ marginBottom: tokens.spacing[2] }}>
              Installed ✓
            </Badge>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
              <div>URL: <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>{webhookStatus.url || 'Not set'}</code></div>
              {webhookStatus.lastReceivedAt && (
                <div>Last received: {new Date(webhookStatus.lastReceivedAt).toLocaleString()}</div>
              )}
              <div>Status: <Badge variant={webhookStatus.status === 'active' ? 'success' : 'warning'}>{webhookStatus.status}</Badge></div>
            </div>
          </div>
        ) : (
          <div>
            <Badge variant="error">Not Installed</Badge>
            <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[2] }}>
              Install webhooks to receive inbound messages
            </p>
          </div>
        )}
      </Card>

      {/* Test SMS */}
      <Card style={{ marginBottom: tokens.spacing[4] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[3] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
            Test SMS
          </h3>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowTestSMSModal(true)}
            disabled={!providerStatus?.connected}
          >
            Send Test SMS
          </Button>
        </div>
        <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
          Send a test SMS using the same send pipeline (chooseFromNumber + TwilioProvider.sendMessage)
        </p>
      </Card>

      {/* Readiness Checks */}
      <Card>
        <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>
          Readiness Checks
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Provider Connection</span>
            <Badge variant={readiness?.provider.ready ? 'success' : 'error'}>
              {readiness?.provider.ready ? 'Ready' : 'Not Ready'}
            </Badge>
          </div>
          {!readiness?.provider.ready && (
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginLeft: tokens.spacing[4] }}>
              {readiness?.provider.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Numbers</span>
            <Badge variant={readiness?.numbers.ready ? 'success' : 'error'}>
              {readiness?.numbers.ready ? 'Ready' : 'Not Ready'}
            </Badge>
          </div>
          {!readiness?.numbers.ready && (
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginLeft: tokens.spacing[4] }}>
              {readiness?.numbers.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Webhooks</span>
            <Badge variant={readiness?.webhooks.ready ? 'success' : 'error'}>
              {readiness?.webhooks.ready ? 'Ready' : 'Not Ready'}
            </Badge>
          </div>
          {!readiness?.webhooks.ready && (
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginLeft: tokens.spacing[4] }}>
              {readiness?.webhooks.message}
            </div>
          )}

          <div style={{ marginTop: tokens.spacing[3], paddingTop: tokens.spacing[3], borderTop: `1px solid ${tokens.colors.border.default}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Overall Status</span>
              <Badge variant={readiness?.overall ? 'success' : 'error'}>
                {readiness?.overall ? 'Ready' : 'Not Ready'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Connect Modal */}
      {showConnectModal && (
        <Modal isOpen={showConnectModal} title="Connect Twilio Provider" onClose={() => setShowConnectModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                Account SID
              </label>
              <Input
                type="text"
                value={connectForm.accountSid}
                onChange={(e) => setConnectForm({ ...connectForm, accountSid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                Auth Token
              </label>
              <Input
                type="password"
                value={connectForm.authToken}
                onChange={(e) => setConnectForm({ ...connectForm, authToken: e.target.value })}
                placeholder="Your Twilio Auth Token"
              />
            </div>
            <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowConnectModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={connectProvider.isPending || !connectForm.accountSid || !connectForm.authToken}
                variant="primary"
              >
                {connectProvider.isPending ? 'Saving...' : 'Save Credentials'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <Modal isOpen={showTestModal} title="Test Connection" onClose={() => setShowTestModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
              Test connection with credentials (optional - uses saved credentials if not provided)
            </p>
            <div>
              <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                Account SID (optional)
              </label>
              <Input
                type="text"
                value={testForm.accountSid}
                onChange={(e) => setTestForm({ ...testForm, accountSid: e.target.value })}
                placeholder="Leave empty to use saved credentials"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                Auth Token (optional)
              </label>
              <Input
                type="password"
                value={testForm.authToken}
                onChange={(e) => setTestForm({ ...testForm, authToken: e.target.value })}
                placeholder="Leave empty to use saved credentials"
              />
            </div>
            <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowTestModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={handleTest}
                disabled={testConnection.isPending}
                variant="primary"
              >
                {testConnection.isPending ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
