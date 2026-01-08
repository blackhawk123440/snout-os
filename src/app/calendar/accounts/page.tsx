"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Modal,
  Badge,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { tokens } from "@/lib/design-tokens";

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
    try {
      const response = await fetch("/api/calendar/accounts");
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/calendar/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        resetForm();
        fetchAccounts();
      } else {
        alert("Failed to save calendar account");
      }
    } catch {
      alert("Failed to save calendar account");
    }
  };

  const resetForm = () => {
    setFormData({ email: "", accessToken: "", refreshToken: "", provider: "google" });
    setShowAddForm(false);
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
      }
    } catch {
      // Silently handle errors
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Calendar Accounts"
        description="Manage calendar integrations"
        actions={
          <div style={{ display: "flex", gap: tokens.spacing[3] }}>
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
            <Button
              variant="secondary"
              onClick={() => window.location.href = "/calendar"}
              leftIcon={<i className="fas fa-arrow-left" />}
            >
              Back to Calendar
            </Button>
          </div>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {loading ? (
          <Card>
            <div style={{ padding: tokens.spacing[6], textAlign: "center" }}>
              <Skeleton height={200} />
            </div>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <EmptyState
              icon="📅"
              title="No calendar accounts"
              description="Add a calendar account to get started"
            />
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing[4] }}>
            {accounts.map((account) => (
              <Card key={account.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: tokens.spacing[4],
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: tokens.spacing[3],
                        marginBottom: tokens.spacing[3],
                      }}
                    >
                      <div
                        style={{
                          width: "3rem",
                          height: "3rem",
                          borderRadius: tokens.borderRadius.full,
                          backgroundColor: tokens.colors.primary[100],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <i
                          className={`fab fa-${account.provider}`}
                          style={{
                            fontSize: tokens.typography.fontSize.xl[0],
                            color: tokens.colors.primary.DEFAULT,
                          }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: tokens.typography.fontWeight.bold,
                            fontSize: tokens.typography.fontSize.lg[0],
                            marginBottom: tokens.spacing[1],
                          }}
                        >
                          {account.email}
                        </div>
                        <div style={{ display: "flex", gap: tokens.spacing[2] }}>
                          <Badge variant="default">{account.provider}</Badge>
                          <Badge
                            variant={account.isActive ? "success" : "error"}
                          >
                            {account.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                      }}
                    >
                      <i className="fas fa-calendar" style={{ marginRight: tokens.spacing[2] }} />
                      Added {new Date(account.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing[2] }}>
                    <Button
                      variant={account.isActive ? "danger" : "primary"}
                      onClick={() => handleToggleActive(account.id, account.isActive)}
                      leftIcon={
                        <i className={`fas fa-${account.isActive ? "pause" : "play"}`} />
                      }
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
        size="full"
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: tokens.spacing[4] }}>
          <Input
            label="Email *"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
          />

          <div>
            <label
              style={{
                display: "block",
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[2],
                color: tokens.colors.text.primary,
              }}
            >
              Provider *
            </label>
            <select
              required
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              style={{
                width: "100%",
                padding: tokens.spacing[3],
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.fontSize.base[0],
                backgroundColor: tokens.colors.background.primary,
                color: tokens.colors.text.primary,
              }}
            >
              <option value="google">Google Calendar</option>
              <option value="outlook">Outlook</option>
              <option value="apple">Apple Calendar</option>
            </select>
          </div>
          
          <Input
            label="Access Token *"
            type="password"
            required
            value={formData.accessToken}
            onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
            placeholder="Paste your access token here"
          />

          <Input
            label="Refresh Token"
            type="password"
            value={formData.refreshToken}
            onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
            placeholder="Paste your refresh token here (optional)"
          />
          
          <div style={{ display: "flex", gap: tokens.spacing[3], paddingTop: tokens.spacing[4] }}>
            <Button
              type="submit"
              variant="primary"
              style={{ flex: 1 }}
            >
              Add Account
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
