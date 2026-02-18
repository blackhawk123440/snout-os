/**
 * Inbox Summary Card
 * 
 * Shows unread count and latest thread preview for Dashboard tab
 */

'use client';

import { Card, Button, Badge, SectionHeader, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface InboxSummaryData {
  unreadCount: number;
  latestThread?: {
    id: string;
    clientName: string;
    lastMessage: string;
    lastActivityAt: string;
  };
}

interface InboxSummaryCardProps {
  sitterId: string;
}

export function InboxSummaryCard({ sitterId }: InboxSummaryCardProps) {
  const { data, isLoading } = useQuery<InboxSummaryData>({
    queryKey: ['sitter-inbox-summary', sitterId],
    queryFn: async () => {
      // Try to get from dashboard API which includes unread count
      const res = await fetch(`/api/sitter/me/dashboard`);
      if (!res.ok) {
        return { unreadCount: 0 };
      }
      const dashboard = await res.json();
      return {
        unreadCount: dashboard.unreadMessageCount || 0,
        // Latest thread would need separate API call - simplified for now
      };
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader title="Inbox" />
        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
          Loading...
        </div>
      </Card>
    );
  }

  const unreadCount = data?.unreadCount || 0;

  return (
    <Card style={{ padding: tokens.spacing[4] }}>
      <SectionHeader title="Inbox" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
        {unreadCount > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
              <Badge variant="warning">
                {unreadCount} {unreadCount === 1 ? 'unread message' : 'unread messages'}
              </Badge>
            </div>
            {data?.latestThread && (
              <div style={{
                padding: tokens.spacing[2],
                backgroundColor: tokens.colors.neutral[50],
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.fontSize.sm[0],
              }}>
                <div style={{ fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[1] }}>
                  {data.latestThread.clientName}
                </div>
                <div style={{ color: tokens.colors.text.secondary }}>
                  {formatDistanceToNow(new Date(data.latestThread.lastActivityAt), { addSuffix: true })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            No unread messages
          </div>
        )}
        <Link href={`/sitters/${sitterId}?tab=messages`}>
          <Button variant="secondary" size="sm" style={{ width: '100%', marginTop: tokens.spacing[2] }}>
            Open Inbox
          </Button>
        </Link>
      </div>
    </Card>
  );
}
