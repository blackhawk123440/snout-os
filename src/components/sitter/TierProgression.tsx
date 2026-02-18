/**
 * Tier Progression Component
 * 
 * Enterprise-grade tier progression visualization with icons, year/level markers,
 * and progress indicators toward next tier.
 */

'use client';

import { Card, SectionHeader, Badge } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { 
  getAllTiers, 
  getTierLevel, 
  getTierIcon, 
  getTierColor,
  toCanonicalTierName,
  type CanonicalTierName 
} from '@/lib/tiers/tier-name-mapper';

interface TierProgressionProps {
  currentTierName: string | null;
  metrics?: {
    avgResponseSeconds: number | null;
    responseRate: number | null;
    offerAcceptRate: number | null;
    offerExpireRate: number | null;
  } | null;
}

export function TierProgression({ currentTierName, metrics }: TierProgressionProps) {
  const allTiers = getAllTiers();
  const currentTier = currentTierName ? toCanonicalTierName(currentTierName) : null;
  const currentLevel = currentTier ? getTierLevel(currentTier) : 0;

  // Calculate progress toward next tier
  const getNextTierRequirements = (): string[] => {
    if (!currentTier || !metrics) {
      return ['Complete booking offers and respond to messages to build tier history'];
    }

    const requirements: string[] = [];
    const nextLevel = currentLevel + 1;

    if (nextLevel > 4) {
      return ['You\'ve reached the highest tier! Maintain your performance.'];
    }

    const nextTier = allTiers[nextLevel - 1] as CanonicalTierName;

    // Bronze -> Silver (Certified)
    if (currentTier === 'Trainee' && nextTier === 'Certified') {
      if (metrics.avgResponseSeconds && metrics.avgResponseSeconds > 1800) {
        requirements.push(`Improve response time: Currently ${Math.floor(metrics.avgResponseSeconds / 60)}min avg, target < 30min`);
      }
      if (metrics.responseRate !== null && metrics.responseRate < 0.70) {
        requirements.push(`Increase response rate: Currently ${(metrics.responseRate * 100).toFixed(0)}%, target ≥70%`);
      }
      if (metrics.offerAcceptRate !== null && metrics.offerAcceptRate < 0.50) {
        requirements.push(`Accept more offers: Currently ${(metrics.offerAcceptRate * 100).toFixed(0)}%, target ≥50%`);
      }
      if (metrics.offerExpireRate !== null && metrics.offerExpireRate >= 0.30) {
        requirements.push(`Reduce expired offers: Currently ${(metrics.offerExpireRate * 100).toFixed(0)}%, target <30%`);
      }
    }
    // Silver -> Gold (Trusted)
    else if (currentTier === 'Certified' && nextTier === 'Trusted') {
      if (metrics.avgResponseSeconds && metrics.avgResponseSeconds > 600) {
        requirements.push(`Improve response time: Currently ${Math.floor(metrics.avgResponseSeconds / 60)}min avg, target < 10min`);
      }
      if (metrics.responseRate !== null && metrics.responseRate < 0.85) {
        requirements.push(`Increase response rate: Currently ${(metrics.responseRate * 100).toFixed(0)}%, target ≥85%`);
      }
      if (metrics.offerAcceptRate !== null && metrics.offerAcceptRate < 0.70) {
        requirements.push(`Accept more offers: Currently ${(metrics.offerAcceptRate * 100).toFixed(0)}%, target ≥70%`);
      }
      if (metrics.offerExpireRate !== null && metrics.offerExpireRate >= 0.20) {
        requirements.push(`Reduce expired offers: Currently ${(metrics.offerExpireRate * 100).toFixed(0)}%, target <20%`);
      }
    }
    // Gold -> Platinum (Elite)
    else if (currentTier === 'Trusted' && nextTier === 'Elite') {
      if (metrics.avgResponseSeconds && metrics.avgResponseSeconds > 300) {
        requirements.push(`Improve response time: Currently ${Math.floor(metrics.avgResponseSeconds / 60)}min avg, target < 5min`);
      }
      if (metrics.responseRate !== null && metrics.responseRate < 0.95) {
        requirements.push(`Increase response rate: Currently ${(metrics.responseRate * 100).toFixed(0)}%, target ≥95%`);
      }
      if (metrics.offerAcceptRate !== null && metrics.offerAcceptRate < 0.80) {
        requirements.push(`Accept more offers: Currently ${(metrics.offerAcceptRate * 100).toFixed(0)}%, target ≥80%`);
      }
      if (metrics.offerExpireRate !== null && metrics.offerExpireRate >= 0.10) {
        requirements.push(`Reduce expired offers: Currently ${(metrics.offerExpireRate * 100).toFixed(0)}%, target <10%`);
      }
    }

    if (requirements.length === 0) {
      requirements.push('Maintain current performance to progress');
    }

    return requirements;
  };

  const nextTierRequirements = getNextTierRequirements();

  return (
    <Card style={{ padding: tokens.spacing[4] }}>
      <SectionHeader title="Tier Progression" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        {/* Tier Stepper */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: tokens.spacing[3],
          position: 'relative',
        }}>
          {allTiers.map((tier, index) => {
            const level = index + 1;
            const isCurrent = currentTier === tier;
            const isUnlocked = currentLevel >= level;
            const tierColor = getTierColor(tier);
            const tierIcon = getTierIcon(tier);

            return (
              <div
                key={tier}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[3],
                  padding: tokens.spacing[3],
                  borderRadius: tokens.borderRadius.md,
                  backgroundColor: isCurrent ? tokens.colors.primary[50] : 'transparent',
                  border: isCurrent ? `2px solid ${tierColor}` : `1px solid ${tokens.colors.border.default}`,
                  position: 'relative',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: tokens.borderRadius.full,
                    backgroundColor: isUnlocked ? tierColor : tokens.colors.neutral[200],
                    color: isUnlocked ? 'white' : tokens.colors.text.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: tokens.typography.fontSize.xl[0],
                    flexShrink: 0,
                  }}
                >
                  <i className={`fas ${tierIcon}`} />
                </div>

                {/* Tier Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[1] }}>
                    <div style={{ 
                      fontWeight: tokens.typography.fontWeight.bold,
                      fontSize: tokens.typography.fontSize.base[0],
                    }}>
                      {tier}
                    </div>
                    <Badge variant={isCurrent ? 'success' : isUnlocked ? 'default' : 'error'}>
                      Level {level}
                    </Badge>
                    {isCurrent && (
                      <Badge variant="info" style={{ fontSize: tokens.typography.fontSize.xs[0] }}>
                        Current
                      </Badge>
                    )}
                    {!isUnlocked && (
                      <Badge variant="error" style={{ fontSize: tokens.typography.fontSize.xs[0] }}>
                        <i className="fas fa-lock" style={{ marginRight: tokens.spacing[1] }} />
                        Locked
                      </Badge>
                    )}
                  </div>
                  {isCurrent && nextTierRequirements.length > 0 && index < allTiers.length - 1 && (
                    <div style={{ 
                      fontSize: tokens.typography.fontSize.xs[0],
                      color: tokens.colors.text.secondary,
                      marginTop: tokens.spacing[1],
                    }}>
                      Next: {allTiers[index + 1]} — {nextTierRequirements[0]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Indicators */}
        {currentTier && metrics && (
          <div style={{
            padding: tokens.spacing[3],
            backgroundColor: tokens.colors.neutral[50],
            borderRadius: tokens.borderRadius.md,
            border: `1px solid ${tokens.colors.border.default}`,
          }}>
            <div style={{
              fontWeight: tokens.typography.fontWeight.semibold,
              fontSize: tokens.typography.fontSize.sm[0],
              marginBottom: tokens.spacing[2],
            }}>
              Progress Toward Next Tier
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
              {nextTierRequirements.map((req, i) => (
                <div key={i} style={{
                  fontSize: tokens.typography.fontSize.xs[0],
                  color: tokens.colors.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                }}>
                  <i className="fas fa-circle" style={{ fontSize: '4px', color: tokens.colors.primary.DEFAULT }} />
                  {req}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Foundation State */}
        {!currentTier && (
          <div style={{
            padding: tokens.spacing[4],
            textAlign: 'center',
            backgroundColor: tokens.colors.neutral[50],
            borderRadius: tokens.borderRadius.md,
          }}>
            <div style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}>
              Complete booking offers and respond to messages to unlock your first tier.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
