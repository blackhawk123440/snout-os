/**
 * Integrations Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  FormRow,
  SectionHeader,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface IntegrationStatus {
  name: string;
  status: 'working' | 'not_configured' | 'error' | 'testing';
  message: string;
  credentials: Array<{
    key: string;
    value: string;
    required: boolean;
    description: string;
    whereToGet: string;
  }>;
  webhookUrl?: string;
  setupSteps: string[];
  icon: string;
  color: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadIntegrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stripeStatus, openphoneStatus, databaseStatus, googleCalendarStatus] = await Promise.all([
        checkStripe(),
        checkOpenPhone(),
        checkDatabase(),
        checkGoogleCalendar(),
      ]);

      setIntegrations([
        {
          name: 'Stripe Payments',
          status: stripeStatus.status,
          message: stripeStatus.message,
          credentials: [
            {
              key: 'STRIPE_SECRET_KEY',
              value: stripeStatus.details?.secretKeyConfigured ? '✅ Set' : '❌ Not set',
              required: true,
              description: 'Your Stripe secret key (starts with sk_live_ for production)',
              whereToGet: 'Stripe Dashboard → Developers → API Keys → Secret key',
            },
            {
              key: 'STRIPE_PUBLISHABLE_KEY',
              value: stripeStatus.details?.publishableKeyConfigured ? '✅ Set' : '❌ Not set',
              required: true,
              description: 'Your Stripe publishable key (starts with pk_live_ for production)',
              whereToGet: 'Stripe Dashboard → Developers → API Keys → Publishable key',
            },
            {
              key: 'STRIPE_WEBHOOK_SECRET',
              value: stripeStatus.details?.webhookSecretConfigured ? '✅ Set' : '❌ Not set',
              required: false,
              description: 'Webhook signing secret for payment confirmations',
              whereToGet: 'Stripe Dashboard → Developers → Webhooks → Add endpoint → Signing secret',
            },
          ],
          webhookUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/stripe`,
          setupSteps: [
            '1. Sign up for Stripe at https://stripe.com',
            '2. Go to Developers → API Keys',
            '3. Copy your Secret Key (sk_live_...) and Publishable Key (pk_live_...)',
            '4. Add them to your .env.local file as STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY',
            '5. Go to Developers → Webhooks',
            '6. Click \'Add endpoint\' and enter: https://yourdomain.com/api/webhooks/stripe',
            '7. Select events: payment_intent.succeeded, invoice.payment_succeeded',
            '8. Copy the webhook signing secret and add as STRIPE_WEBHOOK_SECRET in .env.local',
            '9. Set up your products in Stripe (see product IDs below)',
          ],
          icon: 'fa-credit-card',
          color: '#635BFF',
        },
        {
          name: 'OpenPhone SMS',
          status: openphoneStatus.status,
          message: openphoneStatus.message,
          credentials: [
            {
              key: 'OPENPHONE_API_KEY',
              value: openphoneStatus.details?.apiKeyConfigured
                ? openphoneStatus.status === 'error'
                  ? '⚠️ Set but invalid'
                  : '✅ Set'
                : '❌ Not set',
              required: true,
              description: 'Your OpenPhone API key (should be 40+ characters long)',
              whereToGet: 'OpenPhone Dashboard → Settings → API → Generate API Key (copy the COMPLETE key)',
            },
            {
              key: 'OPENPHONE_NUMBER_ID',
              value: openphoneStatus.details?.numberIdConfigured ? '✅ Set' : '❌ Not set',
              required: true,
              description: 'The ID of your OpenPhone phone number',
              whereToGet: 'OpenPhone Dashboard → Numbers → Select your number → Copy ID from URL or API',
            },
          ],
          webhookUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/sms`,
          setupSteps: [
            '1. Sign up for OpenPhone at https://www.openphone.com',
            '2. Purchase a phone number',
            '3. Go to Settings → API',
            '4. Generate an API key',
            '5. Copy your phone number ID (found in the API or in your number settings)',
            '6. Add OPENPHONE_API_KEY and OPENPHONE_NUMBER_ID to your .env.local file',
            '7. Go to Settings → Webhooks',
            '8. Add webhook URL: https://yourdomain.com/api/webhooks/sms',
            '9. Select events: message.received',
          ],
          icon: 'fa-phone',
          color: '#00D9FF',
        },
        {
          name: 'Database (PostgreSQL)',
          status: databaseStatus.status,
          message: databaseStatus.message,
          credentials: [
            {
              key: 'DATABASE_URL',
              value: databaseStatus.details?.databaseUrlConfigured ? '✅ Set' : '❌ Not set',
              required: true,
              description: 'PostgreSQL connection string',
              whereToGet: 'Your hosting provider (Render, Railway, etc.) → Database → Connection String',
            },
          ],
          setupSteps: [
            '1. Set up a PostgreSQL database (Render, Railway, Supabase, etc.)',
            '2. Copy your database connection string',
            '3. Add DATABASE_URL to your .env.local file',
            '4. Run: npm run db:push (to create tables)',
            '5. Run: npm run db:seed (to seed initial data)',
          ],
          icon: 'fa-database',
          color: '#336791',
        },
        {
          name: 'Google Calendar (Optional)',
          status: googleCalendarStatus.status,
          message: googleCalendarStatus.message,
          credentials: [
            {
              key: 'GOOGLE_CLIENT_ID',
              value: googleCalendarStatus.details?.clientIdConfigured ? '✅ Set' : '❌ Not set',
              required: false,
              description: 'Google OAuth Client ID',
              whereToGet: 'Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client',
            },
            {
              key: 'GOOGLE_CLIENT_SECRET',
              value: googleCalendarStatus.details?.clientSecretConfigured ? '✅ Set' : '❌ Not set',
              required: false,
              description: 'Google OAuth Client Secret',
              whereToGet: 'Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client → Client Secret',
            },
          ],
          setupSteps: [
            '1. Go to https://console.cloud.google.com',
            '2. Create a new project',
            '3. Enable Google Calendar API',
            '4. Go to APIs & Services → Credentials',
            '5. Create OAuth 2.0 Client ID',
            '6. Add authorized redirect URIs: https://yourdomain.com/api/calendar/accounts',
            '7. Copy Client ID and Client Secret',
            '8. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local',
          ],
          icon: 'fa-calendar',
          color: '#4285F4',
        },
      ]);
    } catch (err) {
      setError('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const checkStripe = async (): Promise<{
    status: 'working' | 'not_configured' | 'error' | 'testing';
    message: string;
    details?: any;
  }> => {
    try {
      const response = await fetch('/api/integrations/test/stripe');
      const data = await response.json();
      if (data.working) {
        return { status: 'working', message: data.message || 'Stripe is connected and working', details: data.details };
      }
      return { status: data.status || 'not_configured', message: data.message || 'Stripe is not configured', details: data.details };
    } catch (error) {
      return { status: 'error', message: 'Failed to test Stripe connection' };
    }
  };

  const checkOpenPhone = async (): Promise<{
    status: 'working' | 'not_configured' | 'error' | 'testing';
    message: string;
    details?: any;
  }> => {
    try {
      const response = await fetch('/api/integrations/test/openphone');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          status: 'error',
          message: `Failed to test OpenPhone: HTTP ${response.status} - ${errorData.message || 'Unauthorized'}`,
          details: {
            statusCode: response.status,
            error: errorData.message || 'Invalid API key',
            help: 'Please verify your OPENPHONE_API_KEY in the OpenPhone dashboard and update .env.local',
          },
        };
      }
      const data = await response.json();
      if (data.working) {
        return { status: 'working', message: data.message || 'OpenPhone is connected and working', details: data.details };
      }
      return { status: data.status || 'not_configured', message: data.message || 'OpenPhone is not configured', details: data.details };
    } catch (error: any) {
      return {
        status: 'error',
        message: `Failed to test OpenPhone connection: ${error.message || 'Network error'}`,
        details: { error: error.message },
      };
    }
  };

  const checkDatabase = async (): Promise<{
    status: 'working' | 'not_configured' | 'error' | 'testing';
    message: string;
    details?: any;
  }> => {
    try {
      const response = await fetch('/api/integrations/test/database');
      const data = await response.json();
      if (data.working) {
        return { status: 'working', message: data.message || 'Database is connected and working', details: data.details };
      }
      return { status: data.status || 'not_configured', message: data.message || 'Database is not configured', details: data.details };
    } catch (error) {
      return { status: 'error', message: 'Failed to test database connection' };
    }
  };

  const checkGoogleCalendar = async (): Promise<{
    status: 'working' | 'not_configured' | 'error' | 'testing';
    message: string;
    details?: any;
  }> => {
    try {
      const response = await fetch('/api/integrations/test/google-calendar');
      const data = await response.json();
      if (data.working) {
        return { status: 'working', message: data.message || 'Google Calendar is connected', details: data.details };
      }
      return {
        status: data.status || 'not_configured',
        message: data.message || 'Google Calendar is not configured (optional)',
        details: data.details,
      };
    } catch (error) {
      return { status: 'not_configured', message: 'Google Calendar is optional and not configured' };
    }
  };

  const testIntegration = async (integrationName: string) => {
    setTesting((prev) => ({ ...prev, [integrationName]: true }));
    await loadIntegrations();
    setTesting((prev) => ({ ...prev, [integrationName]: false }));
  };

  const startEdit = (integrationName: string, credKey: string, currentValue: string) => {
    setEditing((prev) => ({
      ...prev,
      [integrationName]: {
        ...prev[integrationName],
        [credKey]: currentValue.replace('✅ Set', '').replace('❌ Not set', '').replace('⚠️ Set but invalid', '').trim(),
      },
    }));
  };

  const cancelEdit = (integrationName: string, credKey: string) => {
    setEditing((prev) => {
      const updated = { ...prev };
      if (updated[integrationName]) {
        const { [credKey]: removed, ...rest } = updated[integrationName];
        updated[integrationName] = rest;
        if (Object.keys(rest).length === 0) {
          delete updated[integrationName];
        }
      }
      return updated;
    });
  };

  const saveCredential = async (integrationName: string, credKey: string) => {
    const value = editing[integrationName]?.[credKey];
    if (value === undefined) return;

    setSaving((prev) => ({ ...prev, [integrationName]: true }));
    setError(null);

    try {
      const response = await fetch('/api/integrations/credentials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: credKey,
          value: value,
        }),
      });

      if (response.ok) {
        setSuccessMessage(`${credKey} saved! Restart server for env changes to take effect.`);
        cancelEdit(integrationName, credKey);
        await loadIntegrations();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save credential');
    } finally {
      setSaving((prev) => ({ ...prev, [integrationName]: false }));
    }
  };

  const updateEditingValue = (integrationName: string, credKey: string, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [integrationName]: {
        ...prev[integrationName],
        [credKey]: value,
      },
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
        return <Badge variant="success">Working</Badge>;
      case 'not_configured':
        return <Badge variant="warning">Not Configured</Badge>;
      case 'error':
        return <Badge variant="error">Error</Badge>;
      default:
        return <Badge variant="neutral">Unknown</Badge>;
    }
  };

  const stripeProducts = [
    { id: 'prod_Rl01hX4ZnMjyUw', name: '30 min Drop-in' },
    { id: 'prod_ShJTVMShHBwi0o', name: '60 min Drop-in' },
    { id: 'prod_Rl026cvNa4BMWR', name: '30 min Walk' },
    { id: 'prod_TL04HXcE0bnF0P', name: '60 min Walk' },
    { id: 'prod_Rl02B1KaOPO5pt', name: 'House Sitting' },
    { id: 'prod_ShJRl7fx9eG6Q8', name: '24/7 Care' },
    { id: 'prod_ShJPPmGgqrJoFL', name: 'Additional Pet (Drop/Walk/Taxi)' },
    { id: 'prod_ShJNSDo3hN9JDj', name: 'Additional Pet (House/24-7)' },
  ];

  return (
    <AppShell physiology="analytical">
      <PageHeader
        title="Integrations"
        description="Manage and test all your third-party integrations"
        actions={
          <Link href="/automation">
            <Button variant="tertiary" leftIcon={<i className="fas fa-robot" />}>
              Automation
            </Button>
          </Link>
        }
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

        {/* Stripe Product IDs Reference */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <SectionHeader title="Stripe Product IDs Reference" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: tokens.spacing[4],
              paddingTop: tokens.spacing[4],
            }}
          >
            {stripeProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                  padding: tokens.spacing[2],
                  backgroundColor: tokens.colors.neutral[50],
                  borderRadius: tokens.borderRadius.md,
                }}
              >
                <code
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    fontFamily: tokens.typography.fontFamily.mono.join(', '),
                    padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                    backgroundColor: tokens.colors.background.primary,
                    borderRadius: tokens.borderRadius.sm,
                  }}
                >
                  {product.id}
                </code>
                <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                  {product.name}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Integrations List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <Skeleton height={300} />
            <Skeleton height={300} />
            <Skeleton height={300} />
          </div>
        ) : integrations.length === 0 ? (
          <EmptyState
            title="No integrations found"
            description="Integrations will appear here once configured"
            icon={<i className="fas fa-plug" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[6] }}>
            {integrations.map((integration) => (
              <Card key={integration.name}>
                {/* Integration Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: tokens.spacing[4],
                    marginBottom: tokens.spacing[4],
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4] }}>
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: tokens.borderRadius.md,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: integration.color,
                        color: 'white',
                        fontSize: tokens.typography.fontSize.xl[0],
                      }}
                    >
                      <i className={`fas ${integration.icon}`} />
                    </div>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary, marginBottom: tokens.spacing[1] }}>
                        {integration.name}
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        {integration.message}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
                    {getStatusBadge(integration.status)}
                    <Button
                      variant="primary"
                      onClick={() => testIntegration(integration.name)}
                      disabled={testing[integration.name]}
                      isLoading={testing[integration.name]}
                      leftIcon={<i className="fas fa-sync-alt" />}
                    >
                      Test Connection
                    </Button>
                  </div>
                </div>

                {/* Credentials */}
                <SectionHeader title="Required Credentials" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3], marginBottom: tokens.spacing[4] }}>
                  {integration.credentials.map((cred) => {
                    const isEditing = editing[integration.name]?.[cred.key] !== undefined;
                    const editValue = editing[integration.name]?.[cred.key] || '';
                    const isSaving = saving[integration.name];
                    const isSet = cred.value.includes('✅') || cred.value.includes('⚠️');

                    return (
                      <Card key={cred.key} style={{ borderColor: cred.required ? tokens.colors.primary[200] : tokens.colors.border.default }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                            <code
                              style={{
                                fontSize: tokens.typography.fontSize.sm[0],
                                fontFamily: tokens.typography.fontFamily.mono.join(', '),
                                fontWeight: tokens.typography.fontWeight.bold,
                                color: tokens.colors.primary.DEFAULT,
                              }}
                            >
                              {cred.key}
                            </code>
                            {cred.required && <Badge variant="error">Required</Badge>}
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                            {cred.description}
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                            <i className="fas fa-info-circle" /> Where to get: {cred.whereToGet}
                          </div>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: tokens.spacing[2], marginTop: tokens.spacing[2] }}>
                              <Input
                                type={cred.key.toLowerCase().includes('secret') || cred.key.toLowerCase().includes('key') ? 'password' : 'text'}
                                value={editValue}
                                onChange={(e) => updateEditingValue(integration.name, cred.key, e.target.value)}
                                placeholder={`Enter ${cred.key}`}
                                disabled={isSaving}
                                style={{ flex: 1 }}
                              />
                              <Button variant="primary" onClick={() => saveCredential(integration.name, cred.key)} disabled={isSaving} isLoading={isSaving}>
                                Save
                              </Button>
                              <Button variant="tertiary" onClick={() => cancelEdit(integration.name, cred.key)} disabled={isSaving}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginTop: tokens.spacing[2] }}>
                              <Badge variant={isSet ? 'success' : 'neutral'}>
                                {isSet ? (
                                  <>
                                    <i className="fas fa-check-circle" style={{ marginRight: tokens.spacing[1] }} />
                                    Set (hidden for security)
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-times-circle" style={{ marginRight: tokens.spacing[1] }} />
                                    Not set
                                  </>
                                )}
                              </Badge>
                              <Button variant="tertiary" size="sm" onClick={() => startEdit(integration.name, cred.key, cred.value)}>
                                <i className="fas fa-edit" style={{ marginRight: tokens.spacing[1] }} />
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Webhook URL */}
                {integration.webhookUrl && (
                  <Card style={{ backgroundColor: tokens.colors.primary[50], marginBottom: tokens.spacing[4] }}>
                    <SectionHeader title="Webhook URL" />
                    <code
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        fontFamily: tokens.typography.fontFamily.mono.join(', '),
                        color: tokens.colors.primary.DEFAULT,
                        wordBreak: 'break-all',
                        paddingTop: tokens.spacing[2],
                      }}
                    >
                      {integration.webhookUrl}
                    </code>
                    <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[2] }}>
                      Copy this URL and add it to your {integration.name} webhook settings
                    </div>
                  </Card>
                )}

                {/* Setup Steps */}
                <SectionHeader title="Setup Instructions" />
                <ol style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], paddingTop: tokens.spacing[2] }}>
                  {integration.setupSteps.map((step, index) => (
                    <li key={index} style={{ display: 'flex', gap: tokens.spacing[3], fontSize: tokens.typography.fontSize.sm[0] }}>
                      <span style={{ fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.primary.DEFAULT }}>
                        {step.split('.')[0]}.
                      </span>
                      <span style={{ color: tokens.colors.text.primary }}>{step.substring(step.indexOf(' ') + 1)}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <Card style={{ marginTop: tokens.spacing[8] }}>
          <SectionHeader title="Quick Links" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: tokens.spacing[4],
              paddingTop: tokens.spacing[4],
            }}
          >
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: tokens.spacing[4],
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.border.default}`,
                textAlign: 'center',
                textDecoration: 'none',
                transition: `all ${tokens.transitions.duration.DEFAULT}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = tokens.shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-credit-card" style={{ fontSize: '2rem', color: '#635BFF', marginBottom: tokens.spacing[2] }} />
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary }}>
                Stripe Dashboard
              </div>
            </a>
            <a
              href="https://app.openphone.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: tokens.spacing[4],
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.border.default}`,
                textAlign: 'center',
                textDecoration: 'none',
                transition: `all ${tokens.transitions.duration.DEFAULT}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = tokens.shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-phone" style={{ fontSize: '2rem', color: '#00D9FF', marginBottom: tokens.spacing[2] }} />
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary }}>
                OpenPhone Dashboard
              </div>
            </a>
            <a
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: tokens.spacing[4],
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.border.default}`,
                textAlign: 'center',
                textDecoration: 'none',
                transition: `all ${tokens.transitions.duration.DEFAULT}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = tokens.shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-calendar" style={{ fontSize: '2rem', color: '#4285F4', marginBottom: tokens.spacing[2] }} />
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary }}>
                Google Cloud Console
              </div>
            </a>
            <Link
              href="/settings"
              style={{
                padding: tokens.spacing[4],
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.border.default}`,
                textAlign: 'center',
                textDecoration: 'none',
                transition: `all ${tokens.transitions.duration.DEFAULT}`,
                display: 'block',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = tokens.shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-cog" style={{ fontSize: '2rem', color: tokens.colors.primary.DEFAULT, marginBottom: tokens.spacing[2] }} />
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary }}>
                System Settings
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
