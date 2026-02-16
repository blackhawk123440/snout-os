/**
 * Sitter SRS Card Component
 * 
 * Shows sitter's Service Reliability Score, tier, and next actions
 */

'use client';

import { Card, Badge, SectionHeader } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';

interface SitterSRSData {
  tier: string;
  score: number;
  provisional: boolean;
  atRisk: boolean;
  atRiskReason?: string;
  breakdown: {
    responsiveness: number;
    acceptance: number;
    completion: number;
    timeliness: number;
    accuracy: number;
    engagement: number;
    conduct: number;
  };
  visits30d: number;
  rolling26w?: number;
  compensation?: {
    basePay: number;
    nextReviewDate?: string;
  };
  perks: {
    priority: boolean;
    multipliers: { holiday: number };
    mentorship: boolean;
    reducedOversight: boolean;
  };
  nextActions: string[];
}

export function SitterSRSCard() {
  const { data, isLoading } = useQuery<SitterSRSData>({
    queryKey: ['sitter-srs'],
    queryFn: async () => {
      const res = await fetch('/api/sitter/me/srs');
      if (!res.ok) throw new Error('Failed to fetch SRS');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card style={{ padding: tokens.spacing[4] }}>
        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
          Loading your performance score...
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader 
          title="Your Level" 
          description="Service Reliability Score and tier status"
        />
        <div style={{ 
          padding: tokens.spacing[4],
          textAlign: 'center',
          color: tokens.colors.text.secondary,
          fontSize: tokens.typography.fontSize.sm[0],
        }}>
          Complete your first visits to generate a performance score.
        </div>
      </Card>
    );
  }

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

  return (
    <Card style={{ padding: tokens.spacing[4] }}>
      <SectionHeader 
        title="Your Level" 
        description="Service Reliability Score and tier status"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        {/* Tier Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
          <Badge 
            variant="default"
            style={{ 
              backgroundColor: tierColors[data.tier] || tokens.colors.neutral[500],
              color: 'white',
              fontSize: tokens.typography.fontSize.base[0],
              padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
            }}
          >
            {tierLabels[data.tier] || data.tier}
          </Badge>
          {data.provisional && (
            <Badge variant="warning">Provisional</Badge>
          )}
          {data.atRisk && (
            <Badge variant="error">At Risk</Badge>
          )}
        </div>

        {/* Score */}
        <div>
          <div style={{ 
            fontSize: tokens.typography.fontSize.xl[0],
            fontWeight: tokens.typography.fontWeight.bold,
            marginBottom: tokens.spacing[1],
          }}>
            Service Reliability Score: {data.score.toFixed(1)}/100
          </div>
          {data.rolling26w && (
            <div style={{ 
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}>
              26-week average: {data.rolling26w.toFixed(1)}
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: tokens.spacing[2],
          fontSize: tokens.typography.fontSize.sm[0],
        }}>
          <div>Responsiveness: {data.breakdown.responsiveness.toFixed(1)}/20</div>
          <div>Acceptance: {data.breakdown.acceptance.toFixed(1)}/12</div>
          <div>Completion: {data.breakdown.completion.toFixed(1)}/8</div>
          <div>Timeliness: {data.breakdown.timeliness.toFixed(1)}/20</div>
          <div>Accuracy: {data.breakdown.accuracy.toFixed(1)}/20</div>
          <div>Engagement: {data.breakdown.engagement.toFixed(1)}/10</div>
          <div>Conduct: {data.breakdown.conduct.toFixed(1)}/10</div>
        </div>

        {/* At Risk Reason */}
        {data.atRisk && data.atRiskReason && (
          <div style={{
            padding: tokens.spacing[3],
            backgroundColor: tokens.colors.error[50],
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.typography.fontSize.sm[0],
            color: tokens.colors.error[700],
          }}>
            <strong>At Risk:</strong> {data.atRiskReason}
          </div>
        )}

        {/* Next Actions */}
        {data.nextActions.length > 0 && (
          <div>
            <div style={{ 
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[2],
            }}>
              Next Actions:
            </div>
            <ul style={{ 
              margin: 0,
              paddingLeft: tokens.spacing[4],
              fontSize: tokens.typography.fontSize.sm[0],
            }}>
              {data.nextActions.map((action, i) => (
                <li key={i} style={{ marginBottom: tokens.spacing[1] }}>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Perks */}
        {(data.perks.priority || data.perks.mentorship || data.perks.reducedOversight) && (
          <div>
            <div style={{ 
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[2],
            }}>
              Perks Unlocked:
            </div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
              {data.perks.priority && '✓ Priority booking access\n'}
              {data.perks.mentorship && '✓ Mentorship opportunities\n'}
              {data.perks.reducedOversight && '✓ Reduced oversight\n'}
              {data.perks.multipliers.holiday > 1 && `✓ ${data.perks.multipliers.holiday}x holiday pay`}
            </div>
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
      </div>
    </Card>
  );
}
