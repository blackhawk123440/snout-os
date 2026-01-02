/**
 * Calendar Accounts Page - System DNA Implementation
 * 
 * Configuration posture: Account connections, tokens, settings.
 * Complete rewrite from legacy styling to System DNA.
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
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  FormRow,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface CalendarAccount {
  id: string;
  email: string;
  provider: string;
  isActive: boolean;
  createdAt: Date | string;
}

export default function CalendarAccountsPage() {
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    accessToken: '',
    refreshToken: '',
    provider: 'google',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/calendar/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch calendar accounts');
      }
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError('Failed to load calendar accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        resetForm();
        fetchAccounts();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save calendar account');
      }
    } catch (err) {
      setError('Failed to save calendar account');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ email: '', accessToken: '', refreshToken: '', provider: 'google' });
    setShowAddForm(false);
    setError(null);
  };

  const handleToggleActive = async (accountId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/calendar/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchAccounts();
      } else {
        setError('Failed to update account status');
      }
    } catch (err) {
      setError('Failed to update account status');
    }
  };

  const providerOptions = [
    { value: 'google', label: 'Google Calendar' },
    { value: 'outlook', label: 'Outlook' },
    { value: 'apple', label: 'Apple Calendar' },
  ];

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Calendar Accounts"
        description="Manage calendar integrations and account connections"
        actions={
          <>
            <Button
              variant="primary"
              energy="active"
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              leftIcon={<i className="fas fa-plus" />}
            >
              Add Account
            </Button>
            <Link href="/calendar">
              <Button variant="tertiary" leftIcon={<i className="fas fa-arrow-left" />}>
                Back to Calendar
              </Button>
            </Link>
          </>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Error Banner */}
        {error && (
          <Card
            depth="critical"
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.error[50],
              borderColor: tokens.colors.error[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>{error}</div>
          </Card>
        )}

        {/* Accounts List */}
        {loading ? (
          <Card depth="elevated">
            <div style={{ padding: tokens.spacing[6] }}>
              <Skeleton height={400} />
            </div>
          </Card>
        ) : accounts.length === 0 ? (
          <EmptyState
            title="No Calendar Accounts"
            description="Add your first calendar account to get started"
            icon={<i className="fas fa-calendar-alt" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: 'Add Account',
              onClick: () => {
                resetForm();
                setShowAddForm(true);
              },
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {accounts.map((account) => (
              <Card key={account.id} depth="elevated">
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: tokens.spacing[4], flex: 1 }}>
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: tokens.borderRadius.full,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: tokens.colors.primary[50],
                        color: tokens.colors.primary.DEFAULT,
                        fontSize: tokens.typography.fontSize.xl[0],
                      }}
                    >
                      <i className={`fab fa-${account.provider}`} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary, marginBottom: tokens.spacing[2] }}>
                        {account.email}
                      </div>
                      <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap', marginBottom: tokens.spacing[2] }}>
                        <Badge variant="info">{account.provider}</Badge>
                        <Badge variant={account.isActive ? 'success' : 'neutral'}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        <i className="fas fa-calendar" style={{ marginRight: tokens.spacing[1] }} />
                        Added {new Date(account.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={account.isActive ? 'danger' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleActive(account.id, account.isActive)}
                    leftIcon={<i className={`fas fa-${account.isActive ? 'pause' : 'play'}`} />}
                  >
                    {account.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Form Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={resetForm}
        title="Add Calendar Account"
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {error && (
              <Card
                depth="critical"
                style={{
                  backgroundColor: tokens.colors.error[50],
                  borderColor: tokens.colors.error[200],
                }}
              >
                <div style={{ padding: tokens.spacing[3], color: tokens.colors.error[700], fontSize: tokens.typography.fontSize.sm[0] }}>
                  {error}
                </div>
              </Card>
            )}

            <FormRow label="Email" required>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="calendar@example.com"
                required
              />
            </FormRow>

            <FormRow label="Provider" required>
              <Select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                options={providerOptions}
                required
              />
            </FormRow>

            <FormRow label="Access Token" required>
              <Input
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                placeholder="Paste your access token here"
                required
              />
            </FormRow>

            <FormRow label="Refresh Token">
              <Input
                type="password"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                placeholder="Paste your refresh token here (optional)"
              />
            </FormRow>

            <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
              <Button variant="tertiary" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                energy="active"
                type="submit"
                isLoading={saving}
                disabled={saving || !formData.email || !formData.accessToken}
              >
                {saving ? 'Adding...' : 'Add Account'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
