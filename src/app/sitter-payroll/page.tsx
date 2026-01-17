/**
 * Sitter Payroll View
 * 
 * Dedicated view for sitters to see their own payroll information
 */

'use client';

import { useState, useEffect } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatCard,
  Skeleton,
  EmptyState,
  Flex,
  Grid,
  GridCol,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface SitterPayrollData {
  sitter: {
    id: string;
    name: string;
    commissionPercentage: number;
  };
  currentPeriod: {
    id: string;
    startDate: Date | string;
    endDate: Date | string;
    status: string;
    totalEarnings: number;
    commissionAmount: number;
    fees: number;
    netPayout: number;
    bookingCount: number;
    bookings: Array<{
      bookingId: string;
      bookingDate: Date | string;
      service: string;
      totalPrice: number;
      commissionPercentage: number;
      commissionAmount: number;
      status: string;
    }>;
  };
  previousPeriod: {
    startDate: Date | string;
    endDate: Date | string;
    totalEarnings: number;
    commissionAmount: number;
    fees: number;
    netPayout: number;
    bookingCount: number;
  };
}

export default function SitterPayrollPage() {
  const [payrollData, setPayrollData] = useState<SitterPayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sitterId, setSitterId] = useState<string | null>(null);

  useEffect(() => {
    // Get sitter ID from URL params or localStorage
    const params = new URLSearchParams(window.location.search);
    const id = params.get('sitterId') || localStorage.getItem('sitterId');
    if (id) {
      setSitterId(id);
      fetchPayrollData(id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchPayrollData = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payroll/sitter/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payroll data');
      }
      const data = await response.json();
      setPayrollData(data);
    } catch (error) {
      console.error('Failed to fetch payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="My Payroll" description="View your earnings and payouts" />
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  if (!sitterId) {
    return (
      <AppShell>
        <PageHeader title="My Payroll" description="View your earnings and payouts" />
        <div style={{ padding: tokens.spacing[6] }}>
          <EmptyState
            icon="👤"
            title="Sitter ID Required"
            description="Please provide a sitter ID to view payroll information"
          />
        </div>
      </AppShell>
    );
  }

  if (!payrollData) {
    return (
      <AppShell>
        <PageHeader title="My Payroll" description="View your earnings and payouts" />
        <div style={{ padding: tokens.spacing[6] }}>
          <EmptyState
            icon="💰"
            title="No Payroll Data"
            description="No payroll information available yet"
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="My Payroll"
        description={`Earnings for ${payrollData.sitter.name}`}
        actions={
          <Button
            variant="tertiary"
            onClick={() => fetchPayrollData(sitterId)}
            leftIcon={<i className="fas fa-sync-alt" />}
          >
            Refresh
          </Button>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Current Period Stats */}
        <div style={{ marginBottom: tokens.spacing[6] }}>
          <Grid gap={4}> {/* Batch 6: UI Constitution compliance */}
            <GridCol span={12} md={6} lg={3}>
              <StatCard
                label="Current Period Earnings"
                value={formatCurrency(payrollData.currentPeriod.totalEarnings)}
                icon={<i className="fas fa-dollar-sign" />}
              />
            </GridCol>
            <GridCol span={12} md={6} lg={3}>
              <StatCard
                label="Commission"
                value={formatCurrency(payrollData.currentPeriod.commissionAmount)}
                icon={<i className="fas fa-percent" />}
              />
            </GridCol>
            <GridCol span={12} md={6} lg={3}>
              <StatCard
                label="Net Payout"
                value={formatCurrency(payrollData.currentPeriod.netPayout)}
                icon={<i className="fas fa-money-bill-wave" />}
              />
            </GridCol>
            <GridCol span={12} md={6} lg={3}>
              <StatCard
                label="Bookings"
                value={payrollData.currentPeriod.bookingCount}
                icon={<i className="fas fa-calendar-check" />}
              />
            </GridCol>
          </Grid>
        </div>

        {/* Current Period Details */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <div
            style={{
              fontSize: tokens.typography.fontSize.lg[0],
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[4],
            }}
          >
            Current Pay Period
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing[4],
            }}
          >
            {formatDate(payrollData.currentPeriod.startDate)} -{' '}
            {formatDate(payrollData.currentPeriod.endDate)}
          </div>

          <div style={{ marginBottom: tokens.spacing[4] }}>
            <Grid gap={4}> {/* Batch 6: UI Constitution compliance */}
              <GridCol span={12} md={6} lg={3}>
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Total Earnings
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xl[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                  >
                    {formatCurrency(payrollData.currentPeriod.totalEarnings)}
                  </div>
                </div>
              </GridCol>
              <GridCol span={12} md={6} lg={3}>
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Commission ({payrollData.sitter.commissionPercentage}%)
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xl[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                  >
                    {formatCurrency(payrollData.currentPeriod.commissionAmount)}
                  </div>
                </div>
              </GridCol>
              <GridCol span={12} md={6} lg={3}>
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Fees
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xl[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                  >
                    {formatCurrency(payrollData.currentPeriod.fees)}
                  </div>
                </div>
              </GridCol>
              <GridCol span={12} md={6} lg={3}>
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Net Payout
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xl[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                      color: tokens.colors.success.DEFAULT,
                    }}
                  >
                    {formatCurrency(payrollData.currentPeriod.netPayout)}
                  </div>
                </div>
              </GridCol>
            </Grid>
          </div>

          {/* Booking Breakdown */}
          {payrollData.currentPeriod.bookings.length > 0 && (
            <div>
              <div
                style={{
                  fontWeight: tokens.typography.fontWeight.semibold,
                  marginBottom: tokens.spacing[3],
                }}
              >
                Booking Breakdown ({payrollData.currentPeriod.bookings.length} bookings)
              </div>
              <Flex direction="column" gap={2}> {/* Batch 6: UI Constitution compliance */}
                {payrollData.currentPeriod.bookings.map((booking) => (
                  <Card key={booking.bookingId}>
                    <Flex justify="space-between" align="center">
                      <div>
                        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                          {booking.service}
                        </div>
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.sm[0],
                            color: tokens.colors.text.secondary,
                          }}
                        >
                          {formatDate(booking.bookingDate)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>{formatCurrency(booking.totalPrice)}</div>
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.sm[0],
                            color: tokens.colors.text.secondary,
                          }}
                        >
                          {formatCurrency(booking.commissionAmount)} (
                          {booking.commissionPercentage}%)
                        </div>
                      </div>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </div>
          )}
        </Card>

        {/* Previous Period Comparison */}
        <Card>
          <div
            style={{
              fontSize: tokens.typography.fontSize.lg[0],
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[4],
            }}
          >
            Previous Period Comparison
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing[4],
            }}
          >
            {formatDate(payrollData.previousPeriod.startDate)} -{' '}
            {formatDate(payrollData.previousPeriod.endDate)}
          </div>

          <div>
            <Grid gap={4}> {/* Batch 6: UI Constitution compliance */}
              <GridCol span={12} md={6} lg={3}>
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Previous Earnings
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.lg[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                  >
                    {formatCurrency(payrollData.previousPeriod.totalEarnings)}
                  </div>
                </div>
              </GridCol>
              <GridCol span={12} md={6} lg={3}>
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Previous Payout
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.lg[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                  >
                    {formatCurrency(payrollData.previousPeriod.netPayout)}
                  </div>
                </div>
              </GridCol>
              <GridCol span={12} md={6} lg={3}>
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Change
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.lg[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                      color:
                        payrollData.currentPeriod.netPayout >=
                        payrollData.previousPeriod.netPayout
                          ? tokens.colors.success.DEFAULT
                          : tokens.colors.error.DEFAULT,
                    }}
                  >
                    {formatCurrency(
                      payrollData.currentPeriod.netPayout -
                        payrollData.previousPeriod.netPayout
                    )}
                  </div>
                </div>
              </GridCol>
            </Grid>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}


