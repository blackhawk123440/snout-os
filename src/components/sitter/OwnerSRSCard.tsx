/**
 * Owner SRS Card Component
 * 
 * Shows sitter's Service Reliability Score, tier, breakdown, and next actions
 * For owners viewing a sitter profile at /sitters/[id]
 */

'use client';

import { Card, Badge, SectionHeader, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';

interface OwnerSRSData {
  snapshot: {
    tier: string;
    rolling30dScore: number;
    rolling30dBreakdown: {
      responsiveness: number;
      acceptance: number;
      completion: number;
      timeliness: number;
      accuracy: number;
      engagement: number;
      conduct: number;
    };
    rolling26wScore?: number;
    rolling26wBreakdown?: {
      responsiveness: number;
      acceptance: number;
      completion: number;
      timeliness: number;
      accuracy: number;
      engagement: number;
      conduct: number;
    };
    provisional: boolean;
    atRisk: boolean;
    atRiskReason?: string;
    visits30d: number;
    offers30d: number;
  } | null;
  current: {
    score: number;
    breakdown: {
      responsiveness: number;
      acceptance: number;
      completion: number;
      timeliness: number;
      accuracy: number;
      engagement: number;
      conduct: number;
    };
  } | null;
  rolling26w: number | null;
  compensation: {
    basePay: number;
    nextReviewDate?: string;
  } | null;
}

interface OwnerSRSCardProps {
  sitterId: string;
}

export function OwnerSRSCard({ sitterId }: OwnerSRSCardProps) {
  const { data, isLoading, error } = useQuery<OwnerSRSData>({
    queryKey: ['sitter-srs', sitterId],
    queryFn: async () => {
      const res = await fetch(`/api/sitters/${sitterId}/srs`);
      if (!res.ok) {
        if (res.status === 404) {
          return { snapshot: null, current: null, rolling26w: null, compensation: null };
        }
        throw new Error('Failed to fetch SRS');
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader title="Service Reliability Score" />
        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
          Loading performance data...
        </div>
      </Card>
    );
  }

  if (error || (!data?.snapshot && !data?.current)) {
    return (
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader title="Service Reliability Score" />
        <EmptyState
          title="No score yet"
          description="This sitter needs more activity to generate a performance score. Complete visits and respond to messages to build their SRS."
          icon="📊"
        />
      </Card>
    );
  }

  const srsData = data.snapshot || data.current;
  if (!srsData) {
    return (
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader title="Service Reliability Score" />
        <EmptyState
          title="No score yet"
          description="This sitter needs more activity to generate a performance score."
          icon="📊"
        />
      </Card>
    );
  }

  const breakdown = data.snapshot?.rolling30dBreakdown || data.current?.breakdown;
  const score = data.snapshot?.rolling30dScore || data.current?.score;
  const tier = data.snapshot?.tier || 'foundation';

  const tierColors: Record<string, string> = {
    foundation: tokens.colors.neutral[500],
    reliant: tokens.colors.info.DEFAULT,
    trusted: tokens.colors.success.DEFAULT,
    preferred: tokens.colors.warning.DEFAULT,
  };

  const tierLabels: Record<string, string> = {
    foundation: 'Foundation',
    reliant: 'Reliant',
    trusted: 'Trusted',
    preferred: 'Preferred',
  };

  // Calculate next actions based on score and breakdown
  const nextActions: string[] = [];
  if (breakdown) {
    if (breakdown.responsiveness < 15) {
      nextActions.push('Improve message response time');
    }
    if (breakdown.acceptance < 8) {
      nextActions.push('Increase booking acceptance rate');
    }
    if (breakdown.timeliness < 15) {
      nextActions.push('Reduce late arrivals');
    }
    if (breakdown.accuracy < 15) {
      nextActions.push('Improve visit accuracy');
    }
    if (data.snapshot?.visits30d < 15) {
      nextActions.push('Complete more visits to exit provisional status');
    }
  }

  return (
    <Card style={{ padding: tokens.spacing[4] }}>
      <SectionHeader 
        title="Service Reliability Score" 
        description="Performance metrics and tier status"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        {/* Tier Badge and Score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], flexWrap: 'wrap' }}>
            <Badge 
              variant="default"
              style={{ 
                backgroundColor: tierColors[tier] || tokens.colors.neutral[500],
                color: 'white',
                fontSize: tokens.typography.fontSize.base[0],
                padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
              }}
            >
              {tierLabels[tier] || tier}
            </Badge>
            {data.snapshot?.provisional && (
              <Badge variant="warning">Provisional</Badge>
            )}
            {data.snapshot?.atRisk && (
              <Badge variant="error">At Risk</Badge>
            )}
          </div>
            <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontSize: tokens.typography.fontSize.xl[0],
              fontWeight: tokens.typography.fontWeight.bold,
            }}>
              {score ? score.toFixed(1) : 'N/A'}/100
            </div>
            {data.snapshot && typeof data.snapshot.visits30d === 'number' && (
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
              }}>
                {data.snapshot.visits30d} visits (30d)
              </div>
            )}
          </div>
        </div>

        {/* 26-week average if available */}
        {data.snapshot?.rolling26wScore && (
          <div style={{
            padding: tokens.spacing[2],
            backgroundColor: tokens.colors.neutral[50],
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.typography.fontSize.sm[0],
          }}>
            <strong>26-week average:</strong> {data.snapshot.rolling26wScore.toFixed(1)}/100
          </div>
        )}

        {/* Category Breakdown */}
        {breakdown && (
          <div>
            <div style={{ 
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[2],
              fontSize: tokens.typography.fontSize.sm[0],
            }}>
              Category Breakdown (30-day):
            </div>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: tokens.spacing[2],
              fontSize: tokens.typography.fontSize.sm[0],
            }}>
              <div>Responsiveness: {breakdown.responsiveness.toFixed(1)}/20</div>
              <div>Acceptance: {breakdown.acceptance.toFixed(1)}/12</div>
              <div>Completion: {breakdown.completion.toFixed(1)}/8</div>
              <div>Timeliness: {breakdown.timeliness.toFixed(1)}/20</div>
              <div>Accuracy: {breakdown.accuracy.toFixed(1)}/20</div>
              <div>Engagement: {breakdown.engagement.toFixed(1)}/10</div>
              <div>Conduct: {breakdown.conduct.toFixed(1)}/10</div>
            </div>
          </div>
        )}

        {/* At Risk Reason */}
        {data.snapshot?.atRisk && data.snapshot?.atRiskReason && (
          <div style={{
            padding: tokens.spacing[3],
            backgroundColor: tokens.colors.error[50],
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.typography.fontSize.sm[0],
            color: tokens.colors.error[700],
          }}>
            <strong>At Risk:</strong> {data.snapshot.atRiskReason}
          </div>
        )}

        {/* Next Actions */}
        {nextActions.length > 0 && (
          <div>
            <div style={{ 
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[2],
              fontSize: tokens.typography.fontSize.sm[0],
            }}>
              Next Actions:
            </div>
            <ul style={{ 
              margin: 0,
              paddingLeft: tokens.spacing[4],
              fontSize: tokens.typography.fontSize.sm[0],
            }}>
              {nextActions.map((action, i) => (
                <li key={i} style={{ marginBottom: tokens.spacing[1] }}>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Compensation */}
        {data.compensation && (
          <div style={{
            padding: tokens.spacing[3],
            backgroundColor: tokens.colors.neutral[50],
            borderRadius: tokens.borderRadius.md,
          }}>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
              <strong>Current Pay:</strong> ${data.compensation.basePay.toFixed(2)}/hour
            </div>
            {data.compensation.nextReviewDate && (
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginTop: tokens.spacing[1],
              }}>
                Next review: {new Date(data.compensation.nextReviewDate).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Raise Eligibility */}
        {score !== undefined && score >= 80 && tier !== 'preferred' && (
          <div style={{
            padding: tokens.spacing[3],
            backgroundColor: tokens.colors.success[50],
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.typography.fontSize.sm[0],
            color: tokens.colors.success[700],
          }}>
            <strong>Eligible for tier promotion</strong> - Score meets requirements for next tier
          </div>
        )}
      </div>
    </Card>
  );
}
