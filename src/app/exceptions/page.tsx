/**
 * Exceptions Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 * 
 * Displays exception queue for unpaid, unassigned, drift, and automation failures.
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
  StatCard,
  EmptyState,
  Skeleton,
  Flex,
  Grid,
  GridCol,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface Exception {
  id: string;
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  bookingId?: string;
  booking?: {
    id: string;
    firstName: string;
    lastName: string;
    service: string;
    startAt: Date | string;
    totalPrice?: number;
    paymentStatus?: string;
    sitterId?: string;
    address?: string;
    notes?: string;
    sitter?: any;
  };
  createdAt: Date | string;
  resolvedAt?: Date | string;
  metadata?: any;
}

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExceptions();
  }, [typeFilter]);

  const fetchExceptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = typeFilter === "all" 
        ? "/api/exceptions" 
        : `/api/exceptions?type=${typeFilter}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch exceptions");
      }
      const data = await response.json();
      setExceptions(data.exceptions || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError('Failed to load exceptions');
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="error">{severity.toUpperCase()}</Badge>;
      case "medium":
        return <Badge variant="warning">{severity.toUpperCase()}</Badge>;
      case "low":
        return <Badge variant="info">{severity.toUpperCase()}</Badge>;
      default:
        return <Badge variant="neutral">{severity.toUpperCase()}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "unpaid":
        return "Unpaid";
      case "unassigned":
        return "Unassigned";
      case "automation_failure":
        return "Automation Failure";
      case "at_risk":
        return "At Risk";
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "unpaid":
        return "fas fa-dollar-sign";
      case "unassigned":
        return "fas fa-user-times";
      case "automation_failure":
        return "fas fa-exclamation-triangle";
      case "at_risk":
        return "fas fa-exclamation-circle";
      default:
        return "fas fa-info-circle";
    }
  };

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "unpaid", label: "Unpaid" },
    { value: "unassigned", label: "Unassigned" },
    { value: "automation_failure", label: "Automation Failures" },
    { value: "at_risk", label: "At Risk" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Exception Queue"
        description="Unpaid, unassigned, drift, and automation failures"
        actions={
          <Button
            variant="tertiary"
            onClick={fetchExceptions}
            disabled={loading}
            leftIcon={<i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />}
          >
            Refresh
          </Button>
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
                onClick={fetchExceptions}
                style={{ marginLeft: tokens.spacing[3] }}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Summary Cards */}
        {summary && (
          <div style={{ marginBottom: tokens.spacing[6] }}>
            <Grid gap={4}> {/* Batch 5: UI Constitution compliance */}
              <GridCol span={12} md={6} lg={3}>
                <StatCard
                  label="Total Exceptions"
                  value={summary.total}
                  icon={<i className="fas fa-exclamation-triangle" />}
                />
              </GridCol>
              <GridCol span={12} md={6} lg={3}>
                <StatCard
                  label="High Severity"
                  value={summary.bySeverity?.high || 0}
                  icon={<i className="fas fa-exclamation-circle" />}
                />
              </GridCol>
              <GridCol span={12} md={6} lg={3}>
                <StatCard
                  label="Medium Severity"
                  value={summary.bySeverity?.medium || 0}
                  icon={<i className="fas fa-exclamation-triangle" />}
                />
              </GridCol>
              <GridCol span={12} md={6} lg={3}>
                <StatCard
                  label="Low Severity"
                  value={summary.bySeverity?.low || 0}
                  icon={<i className="fas fa-info-circle" />}
                />
              </GridCol>
            </Grid>
          </div>
        )}

        {/* Type Filter */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <Flex align="center" gap={4}> {/* Batch 5: UI Constitution compliance */}
            <label
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: tokens.typography.fontWeight.medium,
                color: tokens.colors.text.primary,
              }}
            >
              Filter by Type:
            </label>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={typeOptions}
              style={{ minWidth: '200px' }}
            />
          </Flex>
        </Card>

        {/* Exceptions List */}
        <Card>
          <div
            style={{
              padding: tokens.spacing[4],
              borderBottom: `1px solid ${tokens.colors.border.default}`,
              marginBottom: 0,
            }}
          >
            <div
              style={{
                fontWeight: tokens.typography.fontWeight.bold,
                fontSize: tokens.typography.fontSize.lg[0],
                color: tokens.colors.text.primary,
              }}
            >
              Exceptions ({exceptions.length})
            </div>
          </div>

          {loading ? (
            <div style={{ padding: tokens.spacing[8], textAlign: 'center' }}>
              <Skeleton height={100} />
              <Skeleton height={100} />
              <Skeleton height={100} />
            </div>
          ) : exceptions.length === 0 ? (
            <div style={{ padding: tokens.spacing[8] }}>
              <EmptyState
                title="No exceptions found"
                description="All bookings are in good standing!"
                icon={<i className="fas fa-check-circle" style={{ fontSize: '3rem', color: tokens.colors.success.DEFAULT }} />}
              />
            </div>
          ) : (
            <div>
              {exceptions.map((exception) => {
                const borderColor =
                  exception.severity === "high" ? tokens.colors.error[500] :
                  exception.severity === "medium" ? tokens.colors.warning[500] :
                  tokens.colors.info[500];

                return (
                  <div
                    key={exception.id}
                    style={{
                      padding: tokens.spacing[4],
                      borderLeft: `4px solid ${borderColor}`,
                      borderBottom: `1px solid ${tokens.colors.border.default}`,
                    }}
                  >
                    <Flex align="flex-start" justify="space-between" gap={4}>
                      <Flex align="flex-start" gap={3} style={{ flex: 1 }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: tokens.borderRadius.md,
                            backgroundColor: tokens.colors.neutral[100],
                            color: tokens.colors.text.primary,
                          }}
                        >
                          <Flex align="center" justify="center">
                            <i className={`${getTypeIcon(exception.type)} ${tokens.typography.fontSize.lg[0]}`} />
                          </Flex>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: tokens.spacing[1] }}>
                            <Flex align="center" gap={2} wrap>
                              <div
                                style={{
                                  fontWeight: tokens.typography.fontWeight.bold,
                                  fontSize: tokens.typography.fontSize.lg[0],
                                  color: tokens.colors.text.primary,
                                }}
                              >
                                {exception.title}
                              </div>
                              {getSeverityBadge(exception.severity)}
                              <Badge variant="neutral">{getTypeLabel(exception.type)}</Badge>
                            </Flex>
                          </div>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.sm[0],
                              color: tokens.colors.text.secondary,
                              marginBottom: tokens.spacing[2],
                            }}
                          >
                            {exception.description}
                          </div>
                          {exception.booking && (
                            <div
                              style={{
                                fontSize: tokens.typography.fontSize.sm[0],
                                color: tokens.colors.text.secondary,
                                marginBottom: tokens.spacing[2],
                              }}
                            >
                              <Flex direction="column" gap={1}>
                              <div>
                                <strong>Booking:</strong> {exception.booking.firstName} {exception.booking.lastName} - {exception.booking.service}
                              </div>
                              {exception.booking.startAt && (
                                <div>
                                  <strong>Start:</strong> {formatDate(exception.booking.startAt)}
                                </div>
                              )}
                              {exception.type === "unpaid" && exception.booking.totalPrice && (
                                <div>
                                  <strong>Amount:</strong> ${exception.booking.totalPrice.toFixed(2)}
                                </div>
                              )}
                              </Flex>
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.xs[0],
                              color: tokens.colors.text.tertiary,
                              marginTop: tokens.spacing[2],
                            }}
                          >
                            Created: {formatDate(exception.createdAt)}
                          </div>
                        </div>
                      </Flex>
                      {exception.bookingId && (
                        <Link href={`/bookings/${exception.bookingId}`}>
                          <Button variant="secondary" size="sm">
                            View Booking
                          </Button>
                        </Link>
                      )}
                    </Flex>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
