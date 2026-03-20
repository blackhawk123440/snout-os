'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { OwnerAppShell } from '@/components/layout';
import { tokens } from '@/lib/design-tokens';

interface SitterTier {
  id: string;
  orgId: string;
  name: string;
  pointTarget: number;
  minCompletionRate: number | null;
  minResponseRate: number | null;
  priorityLevel: number;
  commissionSplit: number;
  canTakeHouseSits: boolean;
  canTakeTwentyFourHourCare: boolean;
  isDefault: boolean;
  benefits: string | null;
  description: string | null;
}

export default function TiersPage() {
  const [tiers, setTiers] = useState<SitterTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sitter-tiers");
      if (!response.ok) {
        throw new Error('Failed to fetch tiers');
      }
      const data = await response.json();
      setTiers((data.tiers || []).sort((a: SitterTier, b: SitterTier) => a.priorityLevel - b.priorityLevel));
    } catch (err) {
      setError('Failed to load tiers');
      setTiers([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteTier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tier?")) return;
    
    try {
      const response = await fetch(`/api/sitter-tiers/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchTiers();
      } else {
        setError('Failed to delete tier');
      }
    } catch (err) {
      setError('Failed to delete tier');
    }
  };

  return (
    <OwnerAppShell>
      <PageHeader
        title="Policy Tiers"
        description="Configure policy and entitlement tiers separately from SRS reliability tiers."
        actions={
          <Link href="/settings/tiers/new">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Policy Tier
            </Button>
          </Link>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        <Card style={{ marginBottom: tokens.spacing[4] }}>
          <div style={{ padding: tokens.spacing[4], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            <strong>Separation of concerns:</strong> SRS reliability tiers (Foundation/Reliant/Trusted/Preferred)
            measure performance. Policy tiers here control permissions, routing priority, and commission.
          </div>
        </Card>

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
            </div>
          </Card>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <Skeleton height={150} />
            <Skeleton height={150} />
            <Skeleton height={150} />
          </div>
        ) : tiers.length === 0 ? (
          <EmptyState
            title="No Policy Tiers Configured"
            description="Create your first policy tier for sitter entitlements"
            icon={<Star className="w-12 h-12 text-neutral-300" />}
            action={{
              label: "Create Policy Tier",
              onClick: () => window.location.href = "/settings/tiers/new",
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {tiers.map((tier) => {
              let benefits: Record<string, unknown> = {};
              if (tier.benefits) {
                try {
                  benefits = JSON.parse(tier.benefits);
                } catch {
                  benefits = {};
                }
              }
              return (
                <Card key={tier.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[2], flexWrap: 'wrap' }}>
                        <div
                          style={{
                            fontWeight: tokens.typography.fontWeight.bold,
                            fontSize: tokens.typography.fontSize.lg[0],
                            color: tokens.colors.text.primary,
                          }}
                        >
                          {tier.name}
                        </div>
                        {tier.isDefault && (
                          <Badge variant="warning">Default</Badge>
                        )}
                        <Badge variant="info">Priority: {tier.priorityLevel}</Badge>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: tokens.spacing[4],
                          fontSize: tokens.typography.fontSize.sm[0],
                          color: tokens.colors.text.secondary,
                          marginBottom: tokens.spacing[3],
                        }}
                      >
                        <div>
                          <strong>Point Target:</strong> {tier.pointTarget}
                        </div>
                        <div>
                          <strong>Min Completion:</strong> {tier.minCompletionRate ?? 'N/A'}{tier.minCompletionRate !== null ? '%' : ''}
                        </div>
                        <div>
                          <strong>Min Response:</strong> {tier.minResponseRate ?? 'N/A'}{tier.minResponseRate !== null ? '%' : ''}
                        </div>
                        <div>
                          <strong>Commission Split:</strong> {tier.commissionSplit}%
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
                          {tier.canTakeHouseSits && (
                            <Badge variant="success">House Sits</Badge>
                          )}
                          {tier.canTakeTwentyFourHourCare && (
                            <Badge variant="info">24hr Care</Badge>
                          )}
                        </div>
                      </div>
                      {tier.description && (
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
                          {tier.description}
                        </div>
                      )}
                      {Object.keys(benefits).length > 0 && (
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                          <strong>Benefits:</strong> {JSON.stringify(benefits)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                      <Link href={`/settings/tiers/${tier.id}`}>
                        <Button variant="secondary" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteTier(tier.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </OwnerAppShell>
  );
}
