/**
 * Automation Ledger Page - Enterprise Rebuild
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
  Select,
  Badge,
  EmptyState,
  Skeleton,
  FormRow,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface AutomationRun {
  id: string;
  eventType: string;
  automationType: string | null;
  status: "success" | "failed" | "skipped" | "pending";
  error: string | null;
  metadata: any;
  bookingId: string | null;
  booking: {
    id: string;
    firstName: string;
    lastName: string;
    service: string;
    status: string;
  } | null;
  createdAt: string;
}

export default function AutomationLedgerPage() {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [automationTypeFilter, setAutomationTypeFilter] = useState<string>("all");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns();
  }, [statusFilter, automationTypeFilter]);

  const fetchRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (automationTypeFilter !== "all") {
        params.append("automationType", automationTypeFilter);
      }
      params.append("limit", "100");

      const response = await fetch(`/api/automations/ledger?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch automation runs');
      }
      const data = await response.json();
      setRuns(data.runs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Failed to load automation runs');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="success">{status.toUpperCase()}</Badge>;
      case "failed":
        return <Badge variant="error">{status.toUpperCase()}</Badge>;
      case "skipped":
        return <Badge variant="warning">{status.toUpperCase()}</Badge>;
      case "pending":
        return <Badge variant="info">{status.toUpperCase()}</Badge>;
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  const getAutomationTypeLabel = (type: string | null) => {
    if (!type) return "Unknown";
    return type
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Failed" },
    { value: "skipped", label: "Skipped" },
    { value: "pending", label: "Pending" },
  ];

  const automationTypeOptions = [
    { value: "all", label: "All Types" },
    { value: "bookingConfirmation", label: "Booking Confirmation" },
    { value: "ownerNewBookingAlert", label: "Owner Alert" },
    { value: "nightBeforeReminder", label: "Night Before Reminder" },
    { value: "paymentReminder", label: "Payment Reminder" },
    { value: "sitterAssignment", label: "Sitter Assignment" },
    { value: "postVisitThankYou", label: "Post Visit Thank You" },
    { value: "dailySummary", label: "Daily Summary" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Automation Run Ledger"
        description="View automation execution history and failures"
        actions={
          <Link href="/settings">
            <Button variant="tertiary" leftIcon={<i className="fas fa-arrow-left" />}>
              Back to Settings
            </Button>
          </Link>
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
              <Button
                variant="tertiary"
                size="sm"
                onClick={fetchRuns}
                style={{ marginLeft: tokens.spacing[3] }}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacing[4] }}>
              <FormRow label="Filter by Status">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={statusOptions}
                />
              </FormRow>
              <FormRow label="Filter by Automation Type">
                <Select
                  value={automationTypeFilter}
                  onChange={(e) => setAutomationTypeFilter(e.target.value)}
                  options={automationTypeOptions}
                />
              </FormRow>
            </div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
              Showing {runs.length} of {total} automation runs
            </div>
          </div>
        </Card>

        {/* Runs List */}
        <Card>
          {loading ? (
            <div style={{ padding: tokens.spacing[8], textAlign: 'center' }}>
              <Skeleton height={100} />
              <Skeleton height={100} />
              <Skeleton height={100} />
            </div>
          ) : runs.length === 0 ? (
            <div style={{ padding: tokens.spacing[8] }}>
              <EmptyState
                title="No automation runs found"
                description={
                  statusFilter !== "all" || automationTypeFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Automation runs will appear here once automations start executing"
                }
                icon={<i className="fas fa-history" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
              />
            </div>
          ) : (
            <div>
              {runs.map((run) => (
                <div
                  key={run.id}
                  style={{
                    padding: tokens.spacing[4],
                    borderBottom: `1px solid ${tokens.colors.border.default}`,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing[2] }}>
                      {getStatusBadge(run.status)}
                      <Badge variant="neutral">{getAutomationTypeLabel(run.automationType)}</Badge>
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary }}>
                        {formatDate(run.createdAt)}
                      </div>
                    </div>
                    
                    {run.booking && (
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        <i className="fas fa-calendar" style={{ marginRight: tokens.spacing[1] }} />
                        Booking: {run.booking.firstName} {run.booking.lastName} - {run.booking.service}
                        {run.bookingId && (
                          <Link
                            href={`/bookings/${run.bookingId}`}
                            style={{ marginLeft: tokens.spacing[2], fontSize: tokens.typography.fontSize.xs[0], textDecoration: 'underline', color: tokens.colors.primary.DEFAULT }}
                          >
                            View Booking
                          </Link>
                        )}
                      </div>
                    )}

                    {run.error && (
                      <Card
                        style={{
                          backgroundColor: tokens.colors.error[50],
                          borderColor: tokens.colors.error[200],
                        }}
                      >
                        <div style={{ padding: tokens.spacing[3] }}>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.sm[0],
                              fontWeight: tokens.typography.fontWeight.medium,
                              color: tokens.colors.error[800],
                              marginBottom: tokens.spacing[1],
                            }}
                          >
                            <i className="fas fa-exclamation-circle" style={{ marginRight: tokens.spacing[1] }} />
                            Error:
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.error[700], whiteSpace: 'pre-wrap' }}>
                            {run.error}
                          </div>
                        </div>
                      </Card>
                    )}

                    {run.metadata && Object.keys(run.metadata).length > 0 && (
                      <details>
                        <summary
                          style={{
                            fontSize: tokens.typography.fontSize.sm[0],
                            color: tokens.colors.text.primary,
                            cursor: 'pointer',
                            fontWeight: tokens.typography.fontWeight.medium,
                          }}
                        >
                          <i className="fas fa-info-circle" style={{ marginRight: tokens.spacing[1] }} />
                          View Details
                        </summary>
                        <div
                          style={{
                            marginTop: tokens.spacing[2],
                            padding: tokens.spacing[3],
                            backgroundColor: tokens.colors.neutral[50],
                            borderRadius: tokens.borderRadius.md,
                            border: `1px solid ${tokens.colors.border.default}`,
                            fontSize: tokens.typography.fontSize.xs[0],
                            fontFamily: tokens.typography.fontFamily.mono.join(', '),
                            overflowX: 'auto',
                          }}
                        >
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {JSON.stringify(run.metadata, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
