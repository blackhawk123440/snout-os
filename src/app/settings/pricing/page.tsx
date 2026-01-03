/**
 * Pricing Rules Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface PricingRule {
  id: string;
  name: string;
  type: string;
  value: number;
  conditions: string;
  enabled: boolean;
}

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pricing-rules");
      if (!response.ok) {
        throw new Error('Failed to fetch pricing rules');
      }
      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      setError('Failed to load pricing rules');
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/pricing-rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        fetchRules();
      } else {
        setError('Failed to update rule');
      }
    } catch (err) {
      setError('Failed to update rule');
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pricing rule?")) return;
    
    try {
      const response = await fetch(`/api/pricing-rules/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchRules();
      } else {
        setError('Failed to delete rule');
      }
    } catch (err) {
      setError('Failed to delete rule');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Pricing Rules"
        description="Manage dynamic pricing rules and fees"
        actions={
          <Link href="/settings/pricing/new">
            <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
              Create Rule
            </Button>
          </Link>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
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
        ) : rules.length === 0 ? (
          <EmptyState
            title="No Pricing Rules"
            description="Create your first pricing rule"
            icon={<i className="fas fa-dollar-sign" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: "Create Rule",
              onClick: () => window.location.href = "/settings/pricing/new",
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {rules.map((rule) => {
              const conditions = rule.conditions ? JSON.parse(rule.conditions) : {};
              return (
                <Card key={rule.id}>
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
                          {rule.name}
                        </div>
                        <Badge variant={rule.enabled ? "success" : "neutral"}>
                          {rule.enabled ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="info">{rule.type}</Badge>
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        <div>
                          <strong>Value:</strong> {rule.value}
                        </div>
                        {Object.keys(conditions).length > 0 && (
                          <div style={{ marginTop: tokens.spacing[1] }}>
                            <strong>Conditions:</strong> {JSON.stringify(conditions)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleRule(rule.id, rule.enabled)}
                      >
                        {rule.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Link href={`/settings/pricing/${rule.id}`}>
                        <Button variant="secondary" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
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
    </AppShell>
  );
}
