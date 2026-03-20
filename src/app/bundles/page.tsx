/**
 * Service Bundles — /bundles
 *
 * Create and manage package pricing bundles.
 * Connected to GET/POST /api/ops/bundles.
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerAppShell, LayoutWrapper, PageHeader } from '@/components/layout';
import { Panel, Button, Badge, Skeleton, EmptyState, Flex, Input, Select, Modal } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

interface Bundle {
  id: string;
  name: string;
  serviceType: string;
  visitCount: number;
  priceInCents: number;
  discountPercent: number;
  expirationDays: number;
  autoRenew: boolean;
  enabled: boolean;
  createdAt: string;
}

const defaultForm = {
  name: '',
  serviceType: 'Dog Walking',
  visitCount: 5,
  priceInCents: 20000,
  discountPercent: 10,
  expirationDays: 90,
  autoRenew: false,
};

export default function BundlesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery<{ bundles: Bundle[] }>({
    queryKey: ['bundles'],
    queryFn: async () => {
      const res = await fetch('/api/ops/bundles');
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ops/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create bundle');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      setShowCreate(false);
      setForm(defaultForm);
    },
  });

  const bundles = data?.bundles || [];

  return (
    <OwnerAppShell>
      <LayoutWrapper>
        <PageHeader
          title="Service Bundles"
          subtitle="Package pricing — sell visit packs at a discount"
          actions={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              Create Bundle
            </Button>
          }
        />

        <div style={{ padding: `0 ${tokens.spacing[4]}` }}>
          {isLoading ? (
            <Skeleton height="200px" />
          ) : bundles.length === 0 ? (
            <EmptyState
              title="No bundles yet"
              description="Create a service bundle to offer package pricing to clients."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
              {bundles.map((b) => (
                <Panel key={b.id}>
                  <div style={{ padding: tokens.spacing[4], display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Flex align="center" gap={2}>
                        <span style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
                          {b.name}
                        </span>
                        <Badge variant={b.enabled ? 'success' : 'warning'}>
                          {b.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </Flex>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                        {b.visitCount} {b.serviceType} visits · ${(b.priceInCents / 100).toFixed(2)} · {b.discountPercent}% off
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1] }}>
                        Expires after {b.expirationDays} days{b.autoRenew ? ' · Auto-renew' : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize['2xl']?.[0] || '24px', fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary }}>
                      ${(b.priceInCents / 100).toFixed(0)}
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>

        {showCreate && (
          <Modal isOpen title="Create Bundle" onClose={() => setShowCreate(false)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm[0], fontWeight: 500, marginBottom: 4 }}>Bundle Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="5-Pack Dog Walking" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm[0], fontWeight: 500, marginBottom: 4 }}>Service Type</label>
                <Select
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                  options={[
                    { value: 'Dog Walking', label: 'Dog Walking' },
                    { value: 'Drop-in Visit', label: 'Drop-in Visit' },
                    { value: 'Housesitting', label: 'Housesitting' },
                    { value: '24/7 Care', label: '24/7 Care' },
                  ]}
                />
              </div>
              <Flex gap={3}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm[0], fontWeight: 500, marginBottom: 4 }}>Visits</label>
                  <Input type="number" value={form.visitCount} onChange={(e) => setForm({ ...form, visitCount: parseInt(e.target.value) || 1 })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm[0], fontWeight: 500, marginBottom: 4 }}>Price ($)</label>
                  <Input type="number" value={form.priceInCents / 100} onChange={(e) => setForm({ ...form, priceInCents: Math.round(parseFloat(e.target.value) * 100) || 0 })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm[0], fontWeight: 500, marginBottom: 4 }}>Discount %</label>
                  <Input type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: parseInt(e.target.value) || 0 })} />
                </div>
              </Flex>
              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm[0], fontWeight: 500, marginBottom: 4 }}>Expiration (days)</label>
                <Input type="number" value={form.expirationDays} onChange={(e) => setForm({ ...form, expirationDays: parseInt(e.target.value) || 30 })} />
              </div>
              <Flex gap={2} justify="flex-end">
                <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name}>
                  {createMutation.isPending ? 'Creating…' : 'Create Bundle'}
                </Button>
              </Flex>
            </div>
          </Modal>
        )}
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
