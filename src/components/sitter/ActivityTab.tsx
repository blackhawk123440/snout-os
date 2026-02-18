/**
 * Activity/Logs Tab
 * 
 * Audit/event stream of status changes, availability, offer actions, tier changes, admin overrides
 */

'use client';

import { Card, SectionHeader, EmptyState, Skeleton, Badge } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';

interface ActivityEvent {
  id: string;
  eventType: string;
  actorType: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
  payload: Record<string, any>;
}

interface ActivityTabProps {
  sitterId: string;
}

export function ActivityTab({ sitterId }: ActivityTabProps) {
  const { data, isLoading } = useQuery<ActivityEvent[]>({
    queryKey: ['sitter-activity', sitterId],
    queryFn: async () => {
      const res = await fetch(`/api/sitters/${sitterId}/activity`);
      if (!res.ok) {
        // If endpoint doesn't exist, return foundation state
        if (res.status === 404) {
          return [];
        }
        throw new Error('Failed to fetch activity data');
      }
      return res.json();
    },
    retry: false,
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      'sitter.status_changed': 'Status Changed',
      'sitter.availability_changed': 'Availability Changed',
      'offer.accepted': 'Offer Accepted',
      'offer.declined': 'Offer Declined',
      'offer.expired': 'Offer Expired',
      'tier.changed': 'Tier Changed',
      'admin.override': 'Admin Override',
      'booking.assigned': 'Booking Assigned',
      'booking.completed': 'Booking Completed',
      'messaging.routing_failed': 'Messaging Error',
      'message.inbound_received': 'Message Received',
      'message.outbound_sent': 'Message Sent',
    };
    return labels[eventType] || eventType;
  };

  const getRemediationGuidance = (event: ActivityEvent): string | null => {
    if (event.eventType === 'messaging.routing_failed' && event.payload?.remediation) {
      return event.payload.remediation;
    }
    return null;
  };

  const getActorTypeLabel = (actorType: string) => {
    const labels: Record<string, string> = {
      'owner': 'Owner',
      'sitter': 'Sitter',
      'system': 'System',
      'automation': 'Automation',
    };
    return labels[actorType] || actorType;
  };

  if (isLoading) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <Skeleton height={400} />
      </div>
    );
  }

  // Foundation state - no data yet
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <Card style={{ padding: tokens.spacing[4] }}>
          <SectionHeader title="Activity Log" />
          <EmptyState
            title="Activity log tracks all sitter actions"
            description="This log will show all status changes, availability updates, offer responses, tier changes, and admin overrides. Activity is recorded automatically as actions occur."
            icon="📋"
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: tokens.spacing[4] }}>
      <Card style={{ padding: tokens.spacing[4] }}>
        <SectionHeader title="Activity Log" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
          {data.map((event) => {
            const isError = event.eventType === 'messaging.routing_failed';
            const remediation = getRemediationGuidance(event);
            
            return (
              <div
                key={event.id}
                style={{
                  padding: tokens.spacing[3],
                  borderLeft: `3px solid ${isError ? tokens.colors.error.DEFAULT : tokens.colors.primary.DEFAULT}`,
                  backgroundColor: isError ? tokens.colors.error[50] : tokens.colors.neutral[50],
                  borderRadius: tokens.borderRadius.md,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing[2] }}>
                  <div>
                    <div style={{
                      fontWeight: tokens.typography.fontWeight.semibold,
                      marginBottom: tokens.spacing[1],
                    }}>
                      {getEventTypeLabel(event.eventType)}
                    </div>
                    <div style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                    }}>
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                  <Badge variant={isError ? 'error' : 'default'}>
                    {getActorTypeLabel(event.actorType)}
                  </Badge>
                </div>
                
                {/* Show remediation guidance for errors */}
                {remediation && (
                  <div style={{
                    padding: tokens.spacing[2],
                    marginTop: tokens.spacing[2],
                    marginBottom: tokens.spacing[2],
                    backgroundColor: tokens.colors.warning[50],
                    border: `1px solid ${tokens.colors.warning[200]}`,
                    borderRadius: tokens.borderRadius.md,
                    fontSize: tokens.typography.fontSize.sm[0],
                  }}>
                    <div style={{
                      fontWeight: tokens.typography.fontWeight.semibold,
                      marginBottom: tokens.spacing[1],
                      color: tokens.colors.warning[900],
                    }}>
                      <i className="fas fa-info-circle" style={{ marginRight: tokens.spacing[1] }} />
                      What to do:
                    </div>
                    <div style={{ color: tokens.colors.text.secondary }}>
                      {remediation}
                    </div>
                  </div>
                )}
                
                {/* Show error details */}
                {isError && event.payload && (
                  <div style={{
                    marginTop: tokens.spacing[2],
                    padding: tokens.spacing[2],
                    backgroundColor: tokens.colors.neutral[100],
                    borderRadius: tokens.borderRadius.sm,
                    fontSize: tokens.typography.fontSize.xs[0],
                    fontFamily: 'monospace',
                    color: tokens.colors.text.secondary,
                  }}>
                    <div style={{ marginBottom: tokens.spacing[1] }}>
                      <strong>From:</strong> {event.payload.fromNumber || 'N/A'}
                    </div>
                    <div style={{ marginBottom: tokens.spacing[1] }}>
                      <strong>To:</strong> {event.payload.toNumber || 'N/A'}
                    </div>
                    <div>
                      <strong>Reason:</strong> {event.payload.reason || 'Unknown'}
                    </div>
                  </div>
                )}
                
                {/* Show other payload data for non-error events */}
                {!isError && event.payload && Object.keys(event.payload).length > 0 && (
                  <div style={{
                    fontSize: tokens.typography.fontSize.xs[0],
                    color: tokens.colors.text.secondary,
                    fontFamily: 'monospace',
                    backgroundColor: tokens.colors.neutral[100],
                    padding: tokens.spacing[2],
                    borderRadius: tokens.borderRadius.sm,
                    marginTop: tokens.spacing[2],
                  }}>
                    {JSON.stringify(event.payload, null, 2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
