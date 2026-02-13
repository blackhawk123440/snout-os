/**
 * Sitters Panel - Embedded in Messages tab
 * 
 * Owner can view sitter list, status, and filter threads by sitter
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, Table, TableColumn, EmptyState, Skeleton } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useSitters } from '@/lib/api/numbers-hooks';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import { z } from 'zod';

const windowSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  sitterId: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.string(),
  thread: z.object({
    id: z.string(),
    client: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
});

function useSitterWindows(sitterId: string | null) {
  return useQuery({
    queryKey: ['sitter', sitterId, 'windows'],
    queryFn: () => apiGet(`/api/assignments/windows?sitterId=${sitterId}`, z.array(windowSchema)),
    enabled: !!sitterId,
  });
}

export function SittersPanel() {
  const router = useRouter();
  const { data: sitters = [], isLoading } = useSitters();
  const [selectedSitterId, setSelectedSitterId] = useState<string | null>(null);
  const { data: windows = [] } = useSitterWindows(selectedSitterId);
  
  const activeWindows = windows.filter((w: any) => w.status === 'active');
  const futureWindows = windows.filter((w: any) => w.status === 'future');
  const pastWindows = windows.filter((w: any) => w.status === 'past');

  const sitterColumns: TableColumn<any>[] = [
    { 
      key: 'name', 
      header: 'Sitter Name', 
      render: (s) => s.name || s.id 
    },
    { 
      key: 'status', 
      header: 'Status', 
      render: (s) => {
        const activeCount = activeWindows.filter((w: any) => w.sitterId === s.id).length;
        return (
          <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
            <Badge variant={activeCount > 0 ? 'success' : 'default'}>
              {activeCount > 0 ? `${activeCount} active` : 'Inactive'}
            </Badge>
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedSitterId(s.id);
            }}
          >
            View Threads
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => {
              router.push(`/messages?tab=inbox&sitterId=${s.id}`);
            }}
          >
            Open Inbox View
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton height={400} />;
  }

  if (sitters.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No sitters found"
          description="Sitters will appear here once they are added to the system"
          icon={<i className="fas fa-user-friends" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
        />
      </Card>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: tokens.spacing[4] }}>
        <h2 style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[2] }}>
          Sitters
        </h2>
        <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
          View sitter list, status, and threads. Click "View Threads" to see a sitter's active assignments.
        </p>
      </div>

      <Card style={{ marginBottom: tokens.spacing[4] }}>
        <Table data={sitters} columns={sitterColumns} />
      </Card>

      {selectedSitterId && (
        <Card>
          <div style={{ marginBottom: tokens.spacing[3] }}>
            <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
              {sitters.find((s: any) => s.id === selectedSitterId)?.name || 'Sitter'} - Assignment Windows
            </h3>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => setSelectedSitterId(null)}
              style={{ marginTop: tokens.spacing[2] }}
            >
              Close
            </Button>
          </div>

          {activeWindows.length > 0 && (
            <div style={{ marginBottom: tokens.spacing[4] }}>
              <h4 style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[2] }}>
                Active Windows ({activeWindows.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                {activeWindows.map((w: any) => (
                  <div
                    key={w.id}
                    style={{
                      padding: tokens.spacing[3],
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: tokens.radius.sm,
                      backgroundColor: tokens.colors.success[50],
                    }}
                  >
                    <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                      {w.thread.client.name}
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      {new Date(w.startsAt).toLocaleString()} - {new Date(w.endsAt).toLocaleString()}
                    </div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => router.push(`/messages?tab=inbox&thread=${w.threadId}`)}
                      style={{ marginTop: tokens.spacing[2] }}
                    >
                      Open Thread
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {futureWindows.length > 0 && (
            <div style={{ marginBottom: tokens.spacing[4] }}>
              <h4 style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[2] }}>
                Future Windows ({futureWindows.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                {futureWindows.map((w: any) => (
                  <div
                    key={w.id}
                    style={{
                      padding: tokens.spacing[3],
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: tokens.radius.sm,
                    }}
                  >
                    <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                      {w.thread.client.name}
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      {new Date(w.startsAt).toLocaleString()} - {new Date(w.endsAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastWindows.length > 0 && (
            <div>
              <h4 style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[2] }}>
                Past Windows ({pastWindows.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                {pastWindows.slice(0, 5).map((w: any) => (
                  <div
                    key={w.id}
                    style={{
                      padding: tokens.spacing[3],
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: tokens.radius.sm,
                      opacity: 0.7,
                    }}
                  >
                    <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                      {w.thread.client.name}
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      {new Date(w.startsAt).toLocaleString()} - {new Date(w.endsAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                {pastWindows.length > 5 && (
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                    ... and {pastWindows.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {activeWindows.length === 0 && futureWindows.length === 0 && pastWindows.length === 0 && (
            <EmptyState
              title="No assignment windows"
              description="This sitter has no assignment windows yet"
            />
          )}
        </Card>
      )}
    </div>
  );
}
