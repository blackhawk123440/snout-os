/**
 * Discounts Page - Enterprise Rebuild
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

interface Discount {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  valueType: string;
  usageLimit: number | null;
  usageCount: number;
  enabled: boolean;
  validFrom: string | null;
  validUntil: string | null;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/discounts");
      if (!response.ok) {
        throw new Error('Failed to fetch discounts');
      }
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (err) {
      setError('Failed to load discounts');
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscount = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        fetchDiscounts();
      } else {
        setError('Failed to update discount');
      }
    } catch (err) {
      setError('Failed to update discount');
    }
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;
    
    try {
      const response = await fetch(`/api/discounts/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchDiscounts();
      } else {
        setError('Failed to delete discount');
      }
    } catch (err) {
      setError('Failed to delete discount');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Discounts"
        description="Manage discount codes and automatic discounts"
        actions={
          <Link href="/settings/discounts/new">
            <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
              Create Discount
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
        ) : discounts.length === 0 ? (
          <EmptyState
            title="No Discounts"
            description="Create your first discount"
            icon={<i className="fas fa-ticket-alt" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: "Create Discount",
              onClick: () => window.location.href = "/settings/discounts/new",
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {discounts.map((discount) => (
              <Card key={discount.id}>
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
                        {discount.name}
                      </div>
                      <Badge variant="neutral" style={{ fontFamily: tokens.typography.fontFamily.mono.join(', ') }}>
                        {discount.code}
                      </Badge>
                      <Badge variant={discount.enabled ? "success" : "neutral"}>
                        {discount.enabled ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="info">{discount.type}</Badge>
                    </div>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: tokens.spacing[1],
                      }}
                    >
                      <div>
                        <strong>Value:</strong> {discount.value}
                        {discount.valueType === "percentage" ? "%" : "$"}
                      </div>
                      <div>
                        <strong>Usage:</strong> {discount.usageCount}
                        {discount.usageLimit ? ` / ${discount.usageLimit}` : " / unlimited"}
                      </div>
                      {discount.validFrom && (
                        <div>
                          <strong>Valid From:</strong> {new Date(discount.validFrom).toLocaleDateString()}
                        </div>
                      )}
                      {discount.validUntil && (
                        <div>
                          <strong>Valid Until:</strong> {new Date(discount.validUntil).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleDiscount(discount.id, discount.enabled)}
                    >
                      {discount.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Link href={`/settings/discounts/${discount.id}`}>
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteDiscount(discount.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
