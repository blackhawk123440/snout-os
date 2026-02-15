/**
 * Performance Snapshot Component
 * 
 * Shows key performance metrics: acceptance rate, completion rate, on-time rate, client rating
 */

'use client';

import { Card, StatCard } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

interface PerformanceMetrics {
  acceptanceRate: number | null;
  completionRate: number | null;
  onTimeRate: number | null;
  clientRating: number | null;
  totalEarnings: number | null;
  completedBookingsCount: number;
}

interface PerformanceSnapshotProps {
  performance: PerformanceMetrics;
  currentTier: {
    id: string;
    name: string;
    priorityLevel: number | null;
  } | null;
}

export function PerformanceSnapshot({ performance, currentTier }: PerformanceSnapshotProps) {
  const formatPercentage = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${(value * 100).toFixed(0)}%`;
  };

  const formatRating = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toFixed(1);
  };

  return (
    <Card style={{ padding: tokens.spacing[4] }}>
      <h3 style={{ 
        fontSize: tokens.typography.fontSize.lg[0], 
        fontWeight: tokens.typography.fontWeight.semibold,
        marginBottom: tokens.spacing[4],
      }}>
        Performance Snapshot
      </h3>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: tokens.spacing[3],
      }}>
        <StatCard
          label="Acceptance Rate"
          value={formatPercentage(performance.acceptanceRate)}
          size="sm"
        />
        <StatCard
          label="Completion Rate"
          value={formatPercentage(performance.completionRate)}
          size="sm"
        />
        <StatCard
          label="On-Time Rate"
          value={formatPercentage(performance.onTimeRate)}
          size="sm"
        />
        <StatCard
          label="Client Rating"
          value={formatRating(performance.clientRating)}
          size="sm"
        />
      </div>

      {/* Tier Progress - Foundation Only */}
      {currentTier && (
        <div style={{ 
          marginTop: tokens.spacing[4],
          padding: tokens.spacing[3],
          backgroundColor: tokens.colors.neutral[50],
          borderRadius: tokens.borderRadius.md,
        }}>
          <div style={{ 
            fontSize: tokens.typography.fontSize.sm[0],
            fontWeight: tokens.typography.fontWeight.medium,
            marginBottom: tokens.spacing[2],
          }}>
            Tier Progress
          </div>
          <div style={{ 
            fontSize: tokens.typography.fontSize.xs[0],
            color: tokens.colors.text.secondary,
          }}>
            Current tier: <strong>{currentTier.name}</strong>
          </div>
          <div style={{ 
            marginTop: tokens.spacing[2],
            fontSize: tokens.typography.fontSize.xs[0],
            color: tokens.colors.text.secondary,
            fontStyle: 'italic',
          }}>
            Tier progression logic coming soon
          </div>
        </div>
      )}
    </Card>
  );
}
