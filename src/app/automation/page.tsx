/**
 * Automation Page - Enterprise Rebuild
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
  Select,
  Textarea,
  Badge,
  Tabs,
  TabPanel,
  FormRow,
  Skeleton,
  EmptyState,
  Modal,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface AutomationSettings {
  bookingConfirmation: {
    enabled: boolean;
    sendToClient: boolean;
    sendToSitter: boolean;
    sendToOwner: boolean;
    messageTemplateClient?: string;
    messageTemplateSitter?: string;
    messageTemplateOwner?: string;
  };
  nightBeforeReminder: {
    enabled: boolean;
    sendToClient: boolean;
    sendToSitter: boolean;
    reminderTime: string;
    messageTemplateClient?: string;
    messageTemplateSitter?: string;
  };
  paymentReminder: {
    enabled: boolean;
    sendToClient: boolean;
    reminderDelay: number;
    repeatReminder: boolean;
    repeatInterval: number;
    messageTemplateClient?: string;
  };
  sitterAssignment: {
    enabled: boolean;
    sendToSitter: boolean;
    sendToOwner: boolean;
    messageTemplateSitter?: string;
    messageTemplateOwner?: string;
  };
  postVisitThankYou: {
    enabled: boolean;
    sendToClient: boolean;
    delayAfterVisit: number;
    messageTemplateClient?: string;
  };
  ownerNewBookingAlert: {
    enabled: boolean;
    sendToOwner: boolean;
    sendToClient?: boolean;
    ownerPhoneType: 'personal' | 'openphone';
    messageTemplateClient?: string;
    messageTemplateOwner?: string;
  };
}

type AutomationCategory = 'booking' | 'reminder' | 'payment' | 'notification';

interface AutomationConfig {
  id: keyof AutomationSettings;
  name: string;
  description: string;
  category: AutomationCategory;
}

const automations: AutomationConfig[] = [
  {
    id: 'bookingConfirmation',
    name: 'Booking Confirmation',
    description: 'Sends confirmation messages when a booking is created or confirmed',
    category: 'booking',
  },
  {
    id: 'nightBeforeReminder',
    name: 'Night Before Reminder',
    description: 'Sends reminders the night before scheduled appointments',
    category: 'reminder',
  },
  {
    id: 'paymentReminder',
    name: 'Payment Reminder',
    description: 'Sends payment reminders to clients',
    category: 'payment',
  },
  {
    id: 'sitterAssignment',
    name: 'Sitter Assignment',
    description: 'Notifies sitters and owners when a sitter is assigned',
    category: 'notification',
  },
  {
    id: 'postVisitThankYou',
    name: 'Post Visit Thank You',
    description: 'Sends thank you messages after visits',
    category: 'notification',
  },
  {
    id: 'ownerNewBookingAlert',
    name: 'Owner New Booking Alert',
    description: 'Alerts owner when a new booking is created',
    category: 'notification',
  },
];

const categoryColors: Record<AutomationCategory, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  booking: 'info',
  reminder: 'warning',
  payment: 'success',
  notification: 'default',
};

export default function AutomationPage() {
  const [settings, setSettings] = useState<AutomationSettings>({
    bookingConfirmation: {
      enabled: true,
      sendToClient: true,
      sendToSitter: true,
      sendToOwner: true,
    },
    nightBeforeReminder: {
      enabled: true,
      sendToClient: true,
      sendToSitter: true,
      reminderTime: '19:00',
    },
    paymentReminder: {
      enabled: true,
      sendToClient: true,
      reminderDelay: 24,
      repeatReminder: true,
      repeatInterval: 7,
    },
    sitterAssignment: {
      enabled: true,
      sendToSitter: true,
      sendToOwner: true,
    },
    postVisitThankYou: {
      enabled: true,
      sendToClient: true,
      delayAfterVisit: 30,
    },
    ownerNewBookingAlert: {
      enabled: true,
      sendToOwner: true,
      sendToClient: true,
      ownerPhoneType: 'personal',
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState<AutomationCategory | 'all'>('all');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testingMessage, setTestingMessage] = useState<string | null>(null);
  const [expandedAutomation, setExpandedAutomation] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      if (data.automation) {
        setSettings((prev) => ({
          ...prev,
          ...data.automation,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation: settings }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.automation) {
          setSettings((prev) => ({
            ...prev,
            ...data.automation,
          }));
        }
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save automation settings');
    } finally {
      setSaving(false);
    }
  };

  const updateAutomation = (
    automationId: keyof AutomationSettings,
    updates: Partial<AutomationSettings[keyof AutomationSettings]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      [automationId]: {
        ...prev[automationId],
        ...updates,
      },
    }));
  };

  const handleTestMessage = async (template: string, recipientType: 'client' | 'sitter' | 'owner') => {
    if (!testPhoneNumber.trim()) {
      setError('Please enter a phone number to test');
      return;
    }

    if (!template || template.trim() === '') {
      setError('Please customize the message template first before testing');
      return;
    }

    setTestingMessage(template);
    setError(null);
    try {
      const response = await fetch('/api/automation/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          phoneNumber: testPhoneNumber,
          recipientType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to send test message');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test message');
    } finally {
      setTestingMessage(null);
    }
  };

  const filteredAutomations =
    activeCategory === 'all'
      ? automations
      : automations.filter((a) => a.category === activeCategory);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'booking', label: 'Booking' },
    { id: 'reminder', label: 'Reminder' },
    { id: 'payment', label: 'Payment' },
    { id: 'notification', label: 'Notification' },
  ];

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Automations" description="Configure automated messages and notifications" />
        <Card>
          <Skeleton height="400px" />
        </Card>
      </AppShell>
    );
  }

  if (error && !settings) {
    return (
      <AppShell>
        <PageHeader title="Automations" description="Configure automated messages and notifications" />
        <Card>
          <EmptyState
            icon="⚠️"
            title="Failed to Load Automations"
            description={error}
            action={{
              label: 'Retry',
              onClick: fetchSettings,
              variant: 'primary',
            }}
          />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Automations"
        description="Configure automated messages and notifications"
        actions={
          <>
            <Link href="/integrations">
              <Button variant="secondary" leftIcon={<i className="fas fa-plug" />}>
                Integrations
              </Button>
            </Link>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={saving}
              leftIcon={<i className="fas fa-save" />}
            >
              Save All Settings
            </Button>
          </>
        }
      />

      {error && (
        <Card
          style={{
            marginBottom: tokens.spacing[6],
            borderColor: tokens.colors.error.DEFAULT,
            backgroundColor: tokens.colors.error[50],
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
              color: tokens.colors.error.DEFAULT,
            }}
          >
            <i className="fas fa-exclamation-circle" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {success && (
        <Card
          style={{
            marginBottom: tokens.spacing[6],
            borderColor: tokens.colors.success.DEFAULT,
            backgroundColor: tokens.colors.success[50],
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
              color: tokens.colors.success.DEFAULT,
            }}
          >
            <i className="fas fa-check-circle" />
            <span>Settings saved successfully!</span>
          </div>
        </Card>
      )}

      {/* Test Message Panel */}
      <Card
        style={{
          marginBottom: tokens.spacing[6],
        }}
      >
        <h3
          style={{
            fontSize: tokens.typography.fontSize.lg[0],
            fontWeight: tokens.typography.fontWeight.semibold,
            marginBottom: tokens.spacing[4],
            color: tokens.colors.text.primary,
          }}
        >
          Test Messages
        </h3>
        <FormRow label="Test Phone Number">
          <Input
            type="tel"
            placeholder="+1234567890"
            value={testPhoneNumber}
            onChange={(e) => setTestPhoneNumber(e.target.value)}
          />
        </FormRow>
      </Card>

      {/* Category Filter */}
      <Card
        style={{
          marginBottom: tokens.spacing[6],
        }}
      >
        <Tabs
          tabs={tabs}
          activeTab={activeCategory}
          onTabChange={(id) => setActiveCategory(id as AutomationCategory | 'all')}
        >
          <TabPanel id="all">{null}</TabPanel>
          <TabPanel id="booking">{null}</TabPanel>
          <TabPanel id="reminder">{null}</TabPanel>
          <TabPanel id="payment">{null}</TabPanel>
          <TabPanel id="notification">{null}</TabPanel>
        </Tabs>
      </Card>

      {/* Automation Cards */}
      {filteredAutomations.length === 0 ? (
        <Card>
          <EmptyState
            icon="🤖"
            title="No Automations Found"
            description={`No automations found for category: ${activeCategory}`}
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[6],
          }}
        >
          {filteredAutomations.map((automation) => {
            const config = settings[automation.id];
            const isExpanded = expandedAutomation === automation.id;

            const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
            return (
              <Card 
                key={automation.id}
                style={isMobile ? { padding: tokens.spacing[3] } : undefined}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: tokens.spacing[4],
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: tokens.spacing[4],
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: tokens.borderRadius.md,
                        backgroundColor: tokens.colors.primary[100],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <i
                        className="fas fa-robot"
                        style={{
                          fontSize: tokens.typography.fontSize.xl[0],
                          color: tokens.colors.primary.DEFAULT,
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: tokens.spacing[2],
                          marginBottom: tokens.spacing[1],
                        }}
                      >
                        <h3
                          style={{
                            fontSize: tokens.typography.fontSize.lg[0],
                            fontWeight: tokens.typography.fontWeight.semibold,
                            color: tokens.colors.text.primary,
                            margin: 0,
                          }}
                        >
                          {automation.name}
                        </h3>
                        <Badge variant={categoryColors[automation.category]}>
                          {automation.category}
                        </Badge>
                        <Badge variant={config.enabled ? 'success' : 'neutral'}>
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p
                        style={{
                          fontSize: tokens.typography.fontSize.sm[0],
                          color: tokens.colors.text.secondary,
                          margin: 0,
                          marginBottom: tokens.spacing[3],
                        }}
                      >
                        {automation.description}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing[2],
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) =>
                          updateAutomation(automation.id, { enabled: e.target.checked })
                        }
                      />
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedAutomation(isExpanded ? null : automation.id)
                      }
                      style={isMobile ? { width: '100%', marginTop: tokens.spacing[2] } : undefined}
                    >
                      {isExpanded ? 'Collapse' : 'Configure'}
                    </Button>
                  </div>
                </div>

                {/* Expanded Configuration */}
                {config.enabled && isExpanded && (
                  <div
                    style={{
                      borderTop: `1px solid ${tokens.colors.border.default}`,
                      marginTop: tokens.spacing[4],
                      paddingTop: tokens.spacing[4],
                    }}
                  >
                    {/* Booking Confirmation Config */}
                    {automation.id === 'bookingConfirmation' && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                          gap: tokens.spacing[4],
                        }}
                      >
                        <FormRow>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: tokens.spacing[2],
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={(config as AutomationSettings['bookingConfirmation']).sendToClient}
                              onChange={(e) =>
                                updateAutomation('bookingConfirmation', {
                                  sendToClient: e.target.checked,
                                } as any)
                              }
                            />
                            <span>Send to Client</span>
                          </label>
                        </FormRow>
                        <FormRow>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: tokens.spacing[2],
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={(config as AutomationSettings['bookingConfirmation']).sendToSitter}
                              onChange={(e) =>
                                updateAutomation('bookingConfirmation', {
                                  sendToSitter: e.target.checked,
                                } as any)
                              }
                            />
                            <span>Send to Sitter</span>
                          </label>
                        </FormRow>
                        <FormRow>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: tokens.spacing[2],
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={(config as AutomationSettings['bookingConfirmation']).sendToOwner}
                              onChange={(e) =>
                                updateAutomation('bookingConfirmation', {
                                  sendToOwner: e.target.checked,
                                } as any)
                              }
                            />
                            <span>Send to Owner</span>
                          </label>
                        </FormRow>
                      </div>
                    )}

                    {/* Night Before Reminder Config */}
                    {automation.id === 'nightBeforeReminder' && 'reminderTime' in config && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                          gap: tokens.spacing[4],
                        }}
                      >
                        <FormRow label="Reminder Time">
                          <Input
                            type="time"
                            value={(config as AutomationSettings['nightBeforeReminder']).reminderTime}
                            onChange={(e) =>
                              updateAutomation('nightBeforeReminder', {
                                reminderTime: e.target.value,
                              })
                            }
                          />
                        </FormRow>
                        <FormRow>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: tokens.spacing[2],
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={(config as AutomationSettings['nightBeforeReminder']).sendToClient}
                              onChange={(e) =>
                                updateAutomation('nightBeforeReminder', {
                                  sendToClient: e.target.checked,
                                })
                              }
                            />
                            <span>Send to Client</span>
                          </label>
                        </FormRow>
                        <FormRow>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: tokens.spacing[2],
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={(config as AutomationSettings['nightBeforeReminder']).sendToSitter}
                              onChange={(e) =>
                                updateAutomation('nightBeforeReminder', {
                                  sendToSitter: e.target.checked,
                                })
                              }
                            />
                            <span>Send to Sitter</span>
                          </label>
                        </FormRow>
                      </div>
                    )}

                    {/* Payment Reminder Config */}
                    {automation.id === 'paymentReminder' && 'reminderDelay' in config && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                          gap: tokens.spacing[4],
                        }}
                      >
                        <FormRow label="Reminder Delay (hours)">
                          <Input
                            type="number"
                            value={config.reminderDelay}
                            onChange={(e) =>
                              updateAutomation('paymentReminder', {
                                reminderDelay: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </FormRow>
                        <FormRow>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: tokens.spacing[2],
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={config.sendToClient}
                              onChange={(e) =>
                                updateAutomation('paymentReminder', {
                                  sendToClient: e.target.checked,
                                })
                              }
                            />
                            <span>Send to Client</span>
                          </label>
                        </FormRow>
                        <FormRow>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: tokens.spacing[2],
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={config.repeatReminder}
                              onChange={(e) =>
                                updateAutomation('paymentReminder', {
                                  repeatReminder: e.target.checked,
                                })
                              }
                            />
                            <span>Repeat Reminder</span>
                          </label>
                        </FormRow>
                      </div>
                    )}

                    {/* Generic message template fields */}
                    {'messageTemplateClient' in config && (
                      <FormRow label="Client Message Template">
                        <Textarea
                          rows={6}
                          value={(config as any).messageTemplateClient || ''}
                          onChange={(e) =>
                            updateAutomation(automation.id, {
                              messageTemplateClient: e.target.value,
                            } as any)
                          }
                          placeholder="Enter message template with variables like {{firstName}}, {{service}}, {{date}}"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const template = (config as any).messageTemplateClient || '';
                            handleTestMessage(template, 'client');
                          }}
                          disabled={!testPhoneNumber.trim() || testingMessage !== null}
                          leftIcon={<i className="fas fa-paper-plane" />}
                        >
                          {testingMessage ? 'Sending...' : 'Test Message'}
                        </Button>
                      </FormRow>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

