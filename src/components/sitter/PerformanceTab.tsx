/**
 * Performance Tab
 * 
 * Full performance evaluation view with metrics, trends, and SLA tracking
 */

'use client';

import { Card, SectionHeader, EmptyState, Skeleton } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { PerformanceSnapshot } from './PerformanceSnapshot';
import { useQuery } from '@tanstack/react-query';

interface PerformanceData {
  acceptanceRate: number | null;
  completionRate: number | null;
  onTimeRate: number | null;
  clientRating: number | null;
  totalEarnings: number | null;
  completedBookingsCount: number;
  cancellations: number;
  slaBreaches: number;
  trends?: {
    acceptanceRate: number; // Change over period
    completionRate: number;
    onTimeRate: number;
  };
}

interface PerformanceTabProps {
  sitterId: string;
}

export function PerformanceTab({ sitterId }: PerformanceTabProps) {
  const { data, isLoading } = useQuery<PerformanceData>({
    queryKey: ['sitter-performance', sitterId],
    queryFn: async () => {
      const res = await fetch(`/api/sitters/${sitterId}/performance`);
      if (!res.ok) {
        // If endpoint doesn't exist, return foundation state data
        if (res.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch performance data');
      }
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <Skeleton height={400} />
      </div>
    );
  }

  // Foundation state - no data yet
  if (!data) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <Card style={{ padding: tokens.spacing[4] }}>
          <SectionHeader title="Performance Evaluation" />
          <EmptyState
            title="Performance tracking activates after activity"
            description="Performance metrics will appear here once the sitter has completed bookings and received offers. This includes acceptance rates, completion rates, on-time arrival rates, and client ratings."
            icon="📊"
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      {/* Performance Snapshot */}
      <PerformanceSnapshot
        performance={{
          acceptanceRate: data.acceptanceRate,
          completionRate: data.completionRate,
          onTimeRate: data.onTimeRate,
          clientRating: data.clientRating,
          totalEarnings: data.totalEarnings,
          completedBookingsCount: data.completedBookingsCount,
        }}
        currentTier={null} // Tier shown in Tier tab
      />

      {/* Additional Metrics */}
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader title="Additional Metrics" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: tokens.spacing[3],
          fontSize: tokens.typography.fontSize.sm[0],
        }}>
          <div>
            <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
              Cancellations
            </div>
            <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
              {data.cancellations || 0}
            </div>
          </div>
          <div>
            <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
              SLA Breaches
            </div>
            <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
              {data.slaBreaches || 0}
            </div>
          </div>
        </div>
      </Card>

      {/* Trends (if available) */}
      {data.trends && (
        <Card style={{ padding: tokens.spacing[4] }}>
          <SectionHeader title="Trends (Last 30 Days)" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: tokens.spacing[3],
            fontSize: tokens.typography.fontSize.sm[0],
          }}>
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Acceptance Rate Change
              </div>
              <div style={{
                fontWeight: tokens.typography.fontWeight.semibold,
                color: data.trends.acceptanceRate >= 0 ? tokens.colors.success.DEFAULT : tokens.colors.error.DEFAULT,
              }}>
                {data.trends.acceptanceRate >= 0 ? '+' : ''}{(data.trends.acceptanceRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Completion Rate Change
              </div>
              <div style={{
                fontWeight: tokens.typography.fontWeight.semibold,
                color: data.trends.completionRate >= 0 ? tokens.colors.success.DEFAULT : tokens.colors.error.DEFAULT,
              }}>
                {data.trends.completionRate >= 0 ? '+' : ''}{(data.trends.completionRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                On-Time Rate Change
              </div>
              <div style={{
                fontWeight: tokens.typography.fontWeight.semibold,
                color: data.trends.onTimeRate >= 0 ? tokens.colors.success.DEFAULT : tokens.colors.error.DEFAULT,
              }}>
                {data.trends.onTimeRate >= 0 ? '+' : ''}{(data.trends.onTimeRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
