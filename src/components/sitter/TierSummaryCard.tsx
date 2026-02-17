/**
 * Tier Summary Card
 * 
 * Shows tier summary for Dashboard tab
 */

'use client';

import { Card, Badge, Button, SectionHeader, Skeleton, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';

interface TierSummaryData {
  currentTier: {
    name: string;
    id: string;
  } | null;
  metrics: {
    avgResponseSeconds: number;
    offerAcceptRate: number;
    offerDeclineRate: number;
    offerExpireRate: number;
    lastUpdated: string;
  } | null;
}

interface TierSummaryCardProps {
  sitterId: string;
  onViewDetails: () => void;
}

export function TierSummaryCard({ sitterId, onViewDetails }: TierSummaryCardProps) {
  const { data, isLoading } = useQuery<TierSummaryData>({
    queryKey: ['sitter-tier-summary', sitterId],
    queryFn: async () => {
      const res = await fetch(`/api/sitters/${sitterId}/tier/summary`);
      if (!res.ok) throw new Error('Failed to fetch tier summary');
      return res.json();
    },
  });

  const formatResponseTime = (seconds: number | null | undefined): string => {
    if (!seconds || seconds === 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatPercentage = (rate: number | null | undefined): string => {
    if (rate === null || rate === undefined) return 'N/A';
    return `${(rate * 100).toFixed(0)}%`;
  };

  const tierColors: Record<string, string> = {
    Bronze: tokens.colors.neutral[500],
    Silver: tokens.colors.neutral[400],
    Gold: tokens.colors.warning.DEFAULT,
    Platinum: tokens.colors.info.DEFAULT,
  };

  if (isLoading) {
    return (
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader title="Tier Summary" />
        <Skeleton height={120} />
      </Card>
    );
  }

  // Foundation state - no data yet
  if (!data?.currentTier && !data?.metrics) {
    return (
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader title="Tier Summary" />
        <EmptyState
          title="Tier activates after activity"
          description="Tier activates after you've received booking offers and responded to messages."
          icon="📊"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={onViewDetails}
          style={{ marginTop: tokens.spacing[3], width: '100%' }}
        >
          View Tier Details
        </Button>
      </Card>
    );
  }

  return (
    <Card style={{ padding: tokens.spacing[4] }}>
      <SectionHeader title="Tier Summary" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
        {/* Current Tier Badge */}
        {data.currentTier && (
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
            <Badge
              variant="default"
              style={{
                backgroundColor: tierColors[data.currentTier.name] || tokens.colors.neutral[500],
                color: 'white',
                fontSize: tokens.typography.fontSize.base[0],
                padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
              }}
            >
              {data.currentTier.name}
            </Badge>
          </div>
        )}

        {/* Metrics */}
        {data.metrics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: tokens.spacing[2],
            fontSize: tokens.typography.fontSize.sm[0],
          }}>
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[0.5] }}>
                Avg Response
              </div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                {formatResponseTime(data.metrics.avgResponseSeconds)}
              </div>
            </div>
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[0.5] }}>
                Accept Rate
              </div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                {formatPercentage(data.metrics.offerAcceptRate)}
              </div>
            </div>
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[0.5] }}>
                Expire Rate
              </div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                {formatPercentage(data.metrics.offerExpireRate)}
              </div>
            </div>
            {data.metrics.lastUpdated && (
              <div>
                <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[0.5] }}>
                  Last Updated
                </div>
                <div style={{ fontSize: tokens.typography.fontSize.xs[0] }}>
                  {new Date(data.metrics.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Details Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onViewDetails}
          style={{ marginTop: tokens.spacing[2], width: '100%' }}
        >
          View Tier Details
        </Button>
      </div>
    </Card>
  );
}
