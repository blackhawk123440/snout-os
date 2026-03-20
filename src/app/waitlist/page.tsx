/**
 * Waitlist Management — /waitlist
 *
 * Shows all waitlisted booking requests with status management.
 * Connected to GET /api/waitlist.
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerAppShell, LayoutWrapper, PageHeader } from '@/components/layout';
import { Panel, Button, Badge, Skeleton, EmptyState, Flex } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

interface WaitlistEntry {
  id: string;
  clientName: string;
  service: string;
  preferredDate: string;
  preferredTimeStart: string;
  preferredTimeEnd: string;
  notes: string;
  status: 'waiting' | 'notified' | 'booked' | 'expired';
  position: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { variant: 'info' | 'success' | 'warning' | 'error'; label: string }> = {
  waiting: { variant: 'info', label: 'Waiting' },
  notified: { variant: 'warning', label: 'Notified' },
  booked: { variant: 'success', label: 'Booked' },
  expired: { variant: 'error', label: 'Expired' },
};

export default function WaitlistPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, error } = useQuery<{ entries: WaitlistEntry[] }>({
    queryKey: ['waitlist'],
    queryFn: async () => {
      const res = await fetch('/api/waitlist');
      if (!res.ok) throw new Error('Failed to load waitlist');
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/waitlist/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  });

  const entries = (data?.entries || []).filter(
    (e) => statusFilter === 'all' || e.status === statusFilter
  );

  const waitingCount = (data?.entries || []).filter((e) => e.status === 'waiting').length;

  return (
    <OwnerAppShell>
      <LayoutWrapper>
        <PageHeader
          title="Waitlist"
          subtitle={`${waitingCount} client${waitingCount !== 1 ? 's' : ''} waiting for availability`}
        />

        <div style={{ padding: `0 ${tokens.spacing[4]}`, marginBottom: tokens.spacing[3] }}>
          <Flex gap={2}>
            {['all', 'waiting', 'notified', 'booked', 'expired'].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'primary' : 'secondary'}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </Flex>
        </div>

        <div style={{ padding: `0 ${tokens.spacing[4]}` }}>
          {isLoading ? (
            <Skeleton height="300px" />
          ) : error ? (
            <EmptyState title="Error" description={(error as Error).message} />
          ) : entries.length === 0 ? (
            <EmptyState
              title="No waitlist entries"
              description={statusFilter === 'all' ? 'The waitlist is empty. Clients can join when no sitters are available.' : `No entries with status "${statusFilter}".`}
            />
          ) : (
            <Panel>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {entries.map((entry) => {
                  const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.waiting;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: tokens.spacing[4],
                        borderBottom: `1px solid ${tokens.colors.border.default}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: tokens.spacing[4],
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Flex align="center" gap={2}>
                          <span style={{ fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.primary }}>
                            {entry.clientName}
                          </span>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          <span style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary }}>
                            #{entry.position}
                          </span>
                        </Flex>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                          {entry.service} · {entry.preferredDate ? new Date(entry.preferredDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Flexible date'}
                          {entry.preferredTimeStart && ` · ${entry.preferredTimeStart}–${entry.preferredTimeEnd}`}
                        </div>
                        {entry.notes && (
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1], fontStyle: 'italic' }}>
                            {entry.notes}
                          </div>
                        )}
                        <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1] }}>
                          Added {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <Flex gap={1}>
                        {entry.status === 'waiting' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => updateStatus.mutate({ id: entry.id, status: 'notified' })}
                            disabled={updateStatus.isPending}
                          >
                            Notify
                          </Button>
                        )}
                        {entry.status === 'notified' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => updateStatus.mutate({ id: entry.id, status: 'booked' })}
                            disabled={updateStatus.isPending}
                          >
                            Mark Booked
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => removeEntry.mutate(entry.id)}
                          disabled={removeEntry.isPending}
                        >
                          Remove
                        </Button>
                      </Flex>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
