/**
 * Tier Tab Component
 * 
 * Full tier system UI showing current tier, metrics, history, and improvement suggestions
 */

'use client';

import { Card, Badge, SectionHeader, Skeleton, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { TierProgression } from './TierProgression';
import { toCanonicalTierName } from '@/lib/tiers/tier-name-mapper';

interface TierDetailsData {
  currentTier: {
    name: string;
    id: string;
    reasons: string[];
    assignedAt: string;
  } | null;
  metrics7d: {
    avgResponseSeconds: number;
    medianResponseSeconds: number;
    responseRate: number;
    offerAcceptRate: number;
    offerDeclineRate: number;
    offerExpireRate: number;
    lastUpdated: string;
  } | null;
  metrics30d: {
    avgResponseSeconds: number;
    medianResponseSeconds: number;
    responseRate: number;
    offerAcceptRate: number;
    offerDeclineRate: number;
    offerExpireRate: number;
    lastUpdated: string;
  } | null;
  history: Array<{
    id: string;
    tierName: string;
    assignedAt: string;
    reason: string | null;
    metadata: string | null;
  }>;
}

interface TierTabProps {
  sitterId: string;
}

export function TierTab({ sitterId }: TierTabProps) {
  const { data, isLoading } = useQuery<TierDetailsData>({
    queryKey: ['sitter-tier-details', sitterId],
    queryFn: async () => {
      const res = await fetch(`/api/sitters/${sitterId}/tier/details`);
      if (!res.ok) throw new Error('Failed to fetch tier details');
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

  // Use canonical tier names (Trainee/Certified/Trusted/Elite) for display
  const getCanonicalTierName = (tierName: string): string => {
    return toCanonicalTierName(tierName);
  };

  const tierColors: Record<string, string> = {
    Trainee: tokens.colors.neutral[500],
    Certified: tokens.colors.neutral[400],
    Trusted: tokens.colors.warning.DEFAULT,
    Elite: tokens.colors.info.DEFAULT,
    // Legacy support
    Bronze: tokens.colors.neutral[500],
    Silver: tokens.colors.neutral[400],
    Gold: tokens.colors.warning.DEFAULT,
    Platinum: tokens.colors.info.DEFAULT,
  };

  // Generate improvement hints from metrics
  const generateImprovementHints = (metrics: TierDetailsData['metrics7d']): string[] => {
    const hints: string[] = [];
    if (!metrics) return ['Complete more booking offers and respond to messages to build tier history'];

    if (metrics.avgResponseSeconds > 1800) {
      hints.push('Improve response time: Aim for < 30 minutes average');
    }
    if (metrics.responseRate < 0.70) {
      hints.push('Increase response rate: Respond to more messages requiring response');
    }
    if (metrics.offerAcceptRate < 0.50) {
      hints.push('Increase offer acceptance: Accept more booking offers when available');
    }
    if (metrics.offerExpireRate > 0.30) {
      hints.push('Reduce offer expiration: Respond to offers before they expire');
    }

    if (hints.length === 0) {
      hints.push('Maintain current performance to keep tier');
    }

    return hints;
  };

  if (isLoading) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <Skeleton height={400} />
      </div>
    );
  }

  // Foundation state - no data yet
  if (!data || (!data.currentTier && !data.metrics7d && !data.metrics30d && data.history.length === 0)) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <Card style={{ padding: tokens.spacing[4] }}>
          <SectionHeader title="Tier System" />
          <EmptyState
            title="Tier activates after activity"
            description="Tiers activate after you've received booking offers and responded to messages. Example: Respond to booking offers by SMS with YES/NO to build your tier history."
            icon="📊"
          />
        </Card>
      </div>
    );
  }

  const metrics = data.metrics7d || data.metrics30d;
  const improvementHints = generateImprovementHints(data.metrics7d);

  const canonicalTierName = data?.currentTier ? getCanonicalTierName(data.currentTier.name) : null;

  return (
    <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      {/* Tier Progression */}
      <TierProgression 
        currentTierName={canonicalTierName}
        metrics={data?.metrics7d || null}
      />

      {/* Current Tier Panel */}
      {data && data.currentTier && (
        <Card style={{ padding: tokens.spacing[4] }}>
          <SectionHeader title="Current Tier" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
              <Badge
                variant="default"
                style={{
                  backgroundColor: tierColors[canonicalTierName || data.currentTier.name] || tokens.colors.neutral[500],
                  color: 'white',
                  fontSize: tokens.typography.fontSize.lg[0],
                  padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                }}
              >
                {canonicalTierName || data.currentTier.name}
              </Badge>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                Assigned {new Date(data.currentTier.assignedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Why you're in this tier */}
            {data.currentTier.reasons.length > 0 && (
              <div>
                <div style={{
                  fontWeight: tokens.typography.fontWeight.semibold,
                  marginBottom: tokens.spacing[2],
                  fontSize: tokens.typography.fontSize.sm[0],
                }}>
                  Why you're in this tier:
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: tokens.spacing[4],
                  fontSize: tokens.typography.fontSize.sm[0],
                }}>
                  {data.currentTier.reasons.map((reason, i) => (
                    <li key={i} style={{ marginBottom: tokens.spacing[1] }}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Metrics Breakdown */}
      {metrics && (
        <Card style={{ padding: tokens.spacing[4] }}>
          <SectionHeader 
            title="Metrics Breakdown" 
            description={data.metrics7d ? 'Last 7 days' : 'Last 30 days'}
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: tokens.spacing[3],
            fontSize: tokens.typography.fontSize.sm[0],
          }}>
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Avg Response Time
              </div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                {formatResponseTime(metrics.avgResponseSeconds)}
              </div>
            </div>
            {metrics.medianResponseSeconds && (
              <div>
                <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Median Response Time
                </div>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                  {formatResponseTime(metrics.medianResponseSeconds)}
                </div>
              </div>
            )}
            {metrics.responseRate !== null && metrics.responseRate !== undefined && (
              <div>
                <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Response Rate
                </div>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                  {formatPercentage(metrics.responseRate)}
                </div>
              </div>
            )}
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Offer Accept Rate
              </div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                {formatPercentage(metrics.offerAcceptRate)}
              </div>
            </div>
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Offer Decline Rate
              </div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                {formatPercentage(metrics.offerDeclineRate)}
              </div>
            </div>
            <div>
              <div style={{ color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Offer Expire Rate
              </div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                {formatPercentage(metrics.offerExpireRate)}
              </div>
            </div>
          </div>
          {metrics.lastUpdated && (
            <div style={{
              marginTop: tokens.spacing[3],
              paddingTop: tokens.spacing[3],
              borderTop: `1px solid ${tokens.colors.border.default}`,
              fontSize: tokens.typography.fontSize.xs[0],
              color: tokens.colors.text.secondary,
            }}>
              Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </div>
          )}
        </Card>
      )}

      {/* Tier History Timeline */}
      {data && data.history.length > 0 && (
        <Card style={{ padding: tokens.spacing[4] }}>
          <SectionHeader title="Tier History" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
            {data.history.map((entry, i) => {
              const canonicalName = getCanonicalTierName(entry.tierName);
              return (
                <div
                  key={entry.id}
                  style={{
                    padding: tokens.spacing[3],
                    borderLeft: `3px solid ${tierColors[canonicalName] || tokens.colors.neutral[500]}`,
                    backgroundColor: tokens.colors.neutral[50],
                    borderRadius: tokens.borderRadius.md,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[1] }}>
                    <Badge
                      variant="default"
                      style={{
                        backgroundColor: tierColors[canonicalName] || tokens.colors.neutral[500],
                        color: 'white',
                      }}
                    >
                      {canonicalName}
                    </Badge>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                    {new Date(entry.assignedAt).toLocaleDateString()}
                  </div>
                </div>
                {entry.reason && (
                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                    {entry.reason}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* How to Improve */}
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader title="How to Improve" />
        <ul style={{
          margin: 0,
          paddingLeft: tokens.spacing[4],
          fontSize: tokens.typography.fontSize.sm[0],
        }}>
          {improvementHints.map((hint, i) => (
            <li key={i} style={{ marginBottom: tokens.spacing[2] }}>
              {hint}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
