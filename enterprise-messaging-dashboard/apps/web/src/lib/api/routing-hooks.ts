/**
 * React Query hooks for Routing Control
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from './client';
import { z } from 'zod';

const routingRuleSchema = z.object({
  name: z.string(),
  priority: z.number(),
  description: z.string(),
  enabled: z.boolean(),
  lastEvaluatedAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  evalCount24h: z.number(),
});

export type RoutingRule = z.infer<typeof routingRuleSchema>;

const routingDecisionSchema = z.object({
  target: z.enum(['owner_inbox', 'sitter', 'client']),
  targetId: z.string().optional(),
  reason: z.string(),
  evaluationTrace: z.array(
    z.object({
      step: z.number(),
      rule: z.string(),
      condition: z.string(),
      result: z.boolean(),
      explanation: z.string(),
    }),
  ),
  rulesetVersion: z.string(),
  evaluatedAt: z.string().transform((s) => new Date(s)),
  inputsSnapshot: z.record(z.unknown()),
});

export type RoutingDecision = z.infer<typeof routingDecisionSchema>;

const routingOverrideSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  threadId: z.string(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  startsAt: z.string().transform((s) => new Date(s)),
  endsAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  reason: z.string(),
  createdByUserId: z.string(),
  createdAt: z.string().transform((s) => new Date(s)),
  removedAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  thread: z
    .object({
      id: z.string(),
      client: z.object({
        id: z.string(),
        name: z.string(),
      }),
    })
    .optional(),
});

export type RoutingOverride = z.infer<typeof routingOverrideSchema>;

const routingHistoryEventSchema = z.object({
  decision: routingDecisionSchema,
  timestamp: z.string().transform((s) => new Date(s)),
  eventId: z.string(),
  overrideId: z.string().optional(),
});

export type RoutingHistoryEvent = z.infer<typeof routingHistoryEventSchema>;

export function useRoutingRules() {
  return useQuery({
    queryKey: ['routing-rules'],
    queryFn: () => apiGet<RoutingRule[]>('/api/routing/rules', z.array(routingRuleSchema)),
  });
}

export function useSimulateRoutingMutation() {
  return useMutation({
    mutationFn: (params: {
      threadId?: string;
      clientId?: string;
      timestamp?: string;
      direction?: 'inbound' | 'outbound';
      numberId?: string;
    }) => apiPost<RoutingDecision>('/api/routing/simulate', params, routingDecisionSchema),
  });
}

export function useRoutingHistory(
  threadId: string | null,
  filters?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    target?: string;
    overrideOnly?: boolean;
  },
) {
  const queryParams = new URLSearchParams();
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());
  if (filters?.startDate) queryParams.set('startDate', filters.startDate);
  if (filters?.endDate) queryParams.set('endDate', filters.endDate);
  if (filters?.target) queryParams.set('target', filters.target);
  if (filters?.overrideOnly) queryParams.set('overrideOnly', 'true');

  const queryString = queryParams.toString();
  const endpoint = `/api/routing/threads/${threadId}/history${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['routing-history', threadId, filters],
    queryFn: () =>
      apiGet<{ events: RoutingHistoryEvent[]; total: number }>(
        endpoint,
        z.object({
          events: z.array(routingHistoryEventSchema),
          total: z.number(),
        }),
      ),
    enabled: !!threadId,
  });
}

export function useRoutingOverrides(filters?: {
  threadId?: string;
  activeOnly?: boolean;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.threadId) queryParams.set('threadId', filters.threadId);
  if (filters?.activeOnly) queryParams.set('activeOnly', 'true');

  const queryString = queryParams.toString();
  const endpoint = `/api/routing/overrides${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['routing-overrides', filters],
    queryFn: () => apiGet<RoutingOverride[]>(endpoint, z.array(routingOverrideSchema)),
  });
}

export function useCreateOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      threadId: string;
      target: 'owner_inbox' | 'sitter' | 'client';
      targetId?: string;
      durationHours?: number;
      reason: string;
    }) => apiPost('/api/routing/overrides', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['routing-simulate'] });
      queryClient.invalidateQueries({ queryKey: ['routing-history'] });
    },
  });
}

export function useRemoveOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (overrideId: string) => apiDelete(`/api/routing/overrides/${overrideId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['routing-simulate'] });
      queryClient.invalidateQueries({ queryKey: ['routing-history'] });
    },
  });
}
