/**
 * Calendar Accounts Page - Enterprise Rebuild
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
  Modal,
  Badge,
  EmptyState,
  Skeleton,
  FormRow,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface CalendarAccount {
  id: string;
  email: string;
  provider: string;
  isActive: boolean;
  createdAt: Date;
}

export default function CalendarAccountsPage() {
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    accessToken: "",
    refreshToken: "",
    provider: "google",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/calendar/accounts");
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
    setError(null);

    try {
      const response = await fetch("/api/calendar/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Calendar account added!");
        resetForm();
        fetchAccounts();
      } else {
        setError('Failed to save calendar account');
      }
    } catch (err) {
      setError('Failed to save calendar account');
    }
  };

  const resetForm = () => {
    setFormData({ email: "", accessToken: "", refreshToken: "", provider: "google" });
    setShowAddForm(false);
    setError(null);
  };

  const handleToggleActive = async (accountId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/calendar/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
    { value: "google", label: "Google Calendar" },
    { value: "outlook", label: "Outlook" },
    { value: "apple", label: "Apple Calendar" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Calendar Accounts"
        description="Manage calendar integrations"
        actions={
          <>
            <Button
              variant="primary"
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
        {error && (
          <Card
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.error[50],
              borderColor: tokens.colors.error[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>
              {error}
            </div>
          </Card>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <Skeleton height={150} />
            <Skeleton height={150} />
            <Skeleton height={150} />
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            title="No calendar accounts found"
            description="Add your first calendar account to get started"
            icon={<i className="fas fa-calendar-alt" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: "Add Account",
              onClick: () => {
                resetForm();
                setShowAddForm(true);
              },
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {accounts.map((account) => (
              <Card key={account.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[3] }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: tokens.colors.primary[100],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: tokens.colors.primary.DEFAULT,
                          fontSize: tokens.typography.fontSize.xl[0],
                        }}
                      >
                        <i className={`fab fa-${account.provider}`} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: tokens.typography.fontWeight.bold,
                            fontSize: tokens.typography.fontSize.lg[0],
                            color: tokens.colors.text.primary,
                            marginBottom: tokens.spacing[1],
                          }}
                        >
                          {account.email}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                          <Badge variant="info">{account.provider}</Badge>
                          <Badge variant={account.isActive ? "success" : "error"}>
                            {account.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                        <i className="fas fa-calendar" style={{ width: '16px' }} />
                        <span>Added {new Date(account.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                    <Button
                      variant={account.isActive ? "danger" : "primary"}
                      size="sm"
                      onClick={() => handleToggleActive(account.id, account.isActive)}
                      leftIcon={<i className={`fas fa-${account.isActive ? 'pause' : 'play'}`} />}
                    >
                      {account.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
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
      >
        {error && (
          <div
            style={{
              padding: tokens.spacing[3],
              marginBottom: tokens.spacing[4],
              backgroundColor: tokens.colors.error[50],
              borderRadius: tokens.borderRadius.md,
              color: tokens.colors.error[700],
              fontSize: tokens.typography.fontSize.sm[0],
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <FormRow label="Email *">
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormRow>

            <FormRow label="Provider *">
              <Select
                required
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                options={providerOptions}
              />
            </FormRow>
              
            <FormRow label="Access Token *">
              <Input
                type="password"
                required
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                placeholder="Paste your access token here"
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
              
            <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4] }}>
              <Button
                type="submit"
                variant="primary"
                style={{ flex: 1 }}
              >
                Add Account
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                variant="tertiary"
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
