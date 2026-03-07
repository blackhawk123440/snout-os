'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { OwnerAppShell, PageHeader } from '@/components/layout';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

type SitterReliability = {
  sitterId: string;
  sitter: {
    id: string;
    firstName: string;
    lastName: string;
    active: boolean;
  };
  tier: string;
  score: number;
  provisional: boolean;
  atRisk: boolean;
};

type PolicyTier = {
  id: string;
  name: string;
  priorityLevel: number;
  commissionSplit: number;
};

export default function GrowthPage() {
  const [srsSitters, setSrsSitters] = useState<SitterReliability[]>([]);
  const [policyTiers, setPolicyTiers] = useState<PolicyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [srsRes, tiersRes] = await Promise.all([
          fetch('/api/sitters/srs'),
          fetch('/api/sitter-tiers'),
        ]);
        const srsBody = await srsRes.json().catch(() => ({}));
        const tiersBody = await tiersRes.json().catch(() => ({}));
        if (!srsRes.ok) throw new Error(srsBody.error || 'Failed to fetch sitter reliability data');
        if (!tiersRes.ok) throw new Error(tiersBody.error || 'Failed to fetch policy tiers');
        setSrsSitters(srsBody.sitters || []);
        setPolicyTiers(tiersBody.tiers || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load growth data');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const distribution = useMemo(() => {
    const buckets = { foundation: 0, reliant: 0, trusted: 0, preferred: 0 } as Record<string, number>;
    for (const sitter of srsSitters) {
      const key = sitter.tier?.toLowerCase?.();
      if (key in buckets) buckets[key] += 1;
    }
    return buckets;
  }, [srsSitters]);

  const sortedByScore = useMemo(
    () => [...srsSitters].sort((a, b) => b.score - a.score),
    [srsSitters]
  );
  const topPerformers = sortedByScore.slice(0, 5);
  const bottomPerformers = [...sortedByScore].reverse().slice(0, 5);

  const tierColor = (tier: string) => {
    switch ((tier || '').toLowerCase()) {
      case 'preferred':
        return tokens.colors.info.DEFAULT;
      case 'trusted':
        return tokens.colors.success.DEFAULT;
      case 'reliant':
        return tokens.colors.warning.DEFAULT;
      default:
        return tokens.colors.neutral[500];
    }
  };

  return (
    <OwnerAppShell>
      <PageHeader
        title="Growth / Tiers"
        subtitle="Operational growth view using SRS reliability tiers and separate policy tiers."
        actions={
          <Link href="/settings/tiers">
            <Button variant="primary">Manage Policy Tiers</Button>
          </Link>
        }
      />

      <div className="p-6" style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        <Card>
          <div style={{ padding: tokens.spacing[4], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            <strong>Reliability tiers (SRS)</strong> represent sitter performance. <strong>Policy tiers</strong> in settings
            control entitlements (routing priority, permissions, and commission). They are intentionally separate.
          </div>
        </Card>

        {loading ? (
          <Card><div style={{ padding: tokens.spacing[4] }}>Loading growth data...</div></Card>
        ) : error ? (
          <Card><div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>{error}</div></Card>
        ) : (
          <>
            <Card>
              <div style={{ padding: tokens.spacing[4] }}>
                <h3 style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>
                  Reliability Tier Distribution (SRS)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: tokens.spacing[3] }}>
                  {Object.entries(distribution).map(([tier, count]) => (
                    <div key={tier} style={{ border: `1px solid ${tokens.colors.border.default}`, borderRadius: tokens.borderRadius.md, padding: tokens.spacing[3] }}>
                      <p style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, textTransform: 'capitalize' }}>
                        {tier}
                      </p>
                      <p style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: tokens.spacing[4] }}>
                <h3 style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>
                  Top Performers (SRS)
                </h3>
                {topPerformers.length === 0 ? (
                  <EmptyState title="No reliability snapshots yet" description="Run SRS snapshots to populate growth metrics." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                    {topPerformers.map((sitter) => (
                      <div key={sitter.sitterId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${tokens.colors.border.muted}`, paddingBottom: tokens.spacing[2] }}>
                        <div>
                          <Link href={`/sitters/${sitter.sitterId}`} style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                            {sitter.sitter.firstName} {sitter.sitter.lastName}
                          </Link>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                            Score {sitter.score.toFixed(1)}
                          </div>
                        </div>
                        <Badge variant="default" style={{ backgroundColor: tierColor(sitter.tier), color: '#fff' }}>
                          {sitter.tier}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div style={{ padding: tokens.spacing[4] }}>
                <h3 style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>
                  Bottom Performers (SRS)
                </h3>
                {bottomPerformers.length === 0 ? (
                  <EmptyState title="No reliability snapshots yet" description="Run SRS snapshots to populate growth metrics." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                    {bottomPerformers.map((sitter) => (
                      <div key={sitter.sitterId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${tokens.colors.border.muted}`, paddingBottom: tokens.spacing[2] }}>
                        <div>
                          <Link href={`/sitters/${sitter.sitterId}`} style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                            {sitter.sitter.firstName} {sitter.sitter.lastName}
                          </Link>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                            Score {sitter.score.toFixed(1)}
                          </div>
                        </div>
                        <Badge variant="default" style={{ backgroundColor: tierColor(sitter.tier), color: '#fff' }}>
                          {sitter.tier}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div style={{ padding: tokens.spacing[4] }}>
                <h3 style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>
                  Policy Tier Coverage (Settings)
                </h3>
                {policyTiers.length === 0 ? (
                  <EmptyState
                    title="No policy tiers configured"
                    description="Create policy tiers to control entitlement/routing rules."
                    action={{ label: 'Create Policy Tier', onClick: () => (window.location.href = '/settings/tiers/new') }}
                  />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: tokens.spacing[3] }}>
                    {policyTiers.map((tier) => (
                      <div key={tier.id} style={{ border: `1px solid ${tokens.colors.border.default}`, borderRadius: tokens.borderRadius.md, padding: tokens.spacing[3] }}>
                        <p style={{ fontWeight: tokens.typography.fontWeight.semibold }}>{tier.name}</p>
                        <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                          Priority {tier.priorityLevel} • Commission {tier.commissionSplit}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </OwnerAppShell>
  );
}
