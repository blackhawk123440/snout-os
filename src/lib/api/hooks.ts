/**
 * React Query hooks for Messaging API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from './client';
import { z } from 'zod';

// ============================================
// Threads
// ============================================

const threadSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  clientId: z.string(),
  sitterId: z.string().nullable(),
  numberId: z.string(),
  threadType: z.enum(['front_desk', 'assignment', 'pool', 'other']),
  status: z.enum(['active', 'inactive']),
  ownerUnreadCount: z.number(),
  lastActivityAt: z.string().transform((s) => new Date(s)),
  client: z.object({
    id: z.string(),
    name: z.string(),
    contacts: z.array(z.object({ e164: z.string() })),
  }),
  sitter: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  messageNumber: z.object({
    id: z.string(),
    e164: z.string(),
    class: z.string(),
    status: z.string(),
  }),
  assignmentWindows: z.array(z.object({
    id: z.string(),
    startsAt: z.string().transform((s) => new Date(s)),
    endsAt: z.string().transform((s) => new Date(s)),
  })).optional(),
});

export type Thread = z.infer<typeof threadSchema>;

export function useThreads(filters?: {
  clientId?: string;
  sitterId?: string;
  status?: string;
  unreadOnly?: boolean;
  hasPolicyViolation?: boolean;
  hasDeliveryFailure?: boolean;
  search?: string;
  inbox?: 'all' | 'owner'; // Filter by inbox type: 'all' = all threads, 'owner' = owner inbox only
}) {
  const queryParams = new URLSearchParams();
  if (filters?.clientId) queryParams.set('clientId', filters.clientId);
  if (filters?.sitterId) queryParams.set('sitterId', filters.sitterId);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.unreadOnly) queryParams.set('unreadOnly', 'true');
  if (filters?.hasPolicyViolation) queryParams.set('hasPolicyViolation', 'true');
  if (filters?.hasDeliveryFailure) queryParams.set('hasDeliveryFailure', 'true');
  if (filters?.inbox) {
    if (filters.inbox === 'owner') {
      queryParams.set('scope', 'internal'); // Owner inbox uses scope='internal'
    }
    // 'all' means no scope filter
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/messages/threads${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['threads', filters],
    queryFn: async () => {
      // apiGet will store fetch metadata in window.__lastThreadsFetch
      const response = await apiGet<{ threads: Thread[] }>(endpoint, z.object({
        threads: z.array(threadSchema),
      }));
      return response.threads;
    },
    // Prevent excessive refetching
    refetchInterval: false,
    refetchOnWindowFocus: false, // Disable to prevent 429s on tab switch
    refetchOnMount: false, // Only refetch if data is stale
    refetchOnReconnect: false,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 429 (rate limit) - wait for manual refresh
      if (error?.status === 429 || error?.statusCode === 429) {
        return false;
      }
      // Retry other errors up to 1 time
      return failureCount < 1;
    },
  });
}

export function useThread(threadId: string | null) {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      const response = await apiGet<{ thread: Thread }>(
        `/api/messages/threads/${threadId}`,
        z.object({ thread: threadSchema })
      );
      return response.thread;
    },
    enabled: !!threadId,
  });
}

export function useMarkThreadRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) =>
      apiPatch(`/api/threads/${threadId}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

// ============================================
// Messages
// ============================================

const deliverySchema = z.object({
  id: z.string(),
  attemptNo: z.number(),
  status: z.enum(['queued', 'sent', 'delivered', 'failed']),
  providerErrorCode: z.string().nullable(),
  providerErrorMessage: z.string().nullable(),
  createdAt: z.string().transform((s) => new Date(s)),
});

const policyViolationSchema = z.object({
  id: z.string(),
  violationType: z.string(),
  detectedSummary: z.string(),
  actionTaken: z.string(),
});

const messageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  senderType: z.enum(['client', 'sitter', 'owner', 'system', 'automation']),
  senderId: z.string().nullable(),
  body: z.string(),
  redactedBody: z.string().nullable(),
  hasPolicyViolation: z.boolean(),
  createdAt: z.string().transform((s) => new Date(s)),
  deliveries: z.array(deliverySchema),
  policyViolations: z.array(policyViolationSchema),
});

export type Message = z.infer<typeof messageSchema>;

export function useMessages(threadId: string | null) {
  return useQuery({
    queryKey: ['messages', threadId],
    queryFn: () =>
      apiGet<Message[]>(
        `/api/messages/threads/${threadId}/messages`,
        z.array(messageSchema),
      ),
    enabled: !!threadId,
    // Prevent excessive refetching
    refetchInterval: false,
    refetchOnWindowFocus: false, // Disable to prevent 429s
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 10000, // Consider data fresh for 10 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 429 (rate limit)
      if (error?.status === 429 || error?.statusCode === 429) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { threadId: string; body: string; forceSend?: boolean; confirmPoolFallback?: boolean }) =>
      apiPost<{ messageId: string; providerMessageSid?: string; hasPolicyViolation: boolean }>(
        '/api/messages/send',
        params,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useRetryMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      apiPost<{ success: boolean; attemptNo: number }>(
        `/api/messages/${messageId}/retry`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// ============================================
// Routing
// ============================================

const routingEvaluationStepSchema = z.object({
  step: z.number(),
  rule: z.string(),
  condition: z.string(),
  result: z.boolean(),
  explanation: z.string(),
});

const routingDecisionSchema = z.object({
  target: z.enum(['owner_inbox', 'sitter', 'client']),
  targetId: z.string().optional(),
  reason: z.string(),
  evaluationTrace: z.array(routingEvaluationStepSchema),
  rulesetVersion: z.string(),
  evaluatedAt: z.string().transform((s) => new Date(s)),
  inputsSnapshot: z.record(z.string(), z.unknown()),
});

export type RoutingDecision = z.infer<typeof routingDecisionSchema>;

export function useRoutingHistory(threadId: string | null) {
  return useQuery({
    queryKey: ['routing-history', threadId],
    queryFn: () =>
      apiGet<{ events: Array<{ decision: RoutingDecision; timestamp: string }> }>(
        `/api/routing/threads/${threadId}/history`,
      ),
    enabled: !!threadId,
  });
}

export function useSimulateRouting() {
  return useMutation({
    mutationFn: (params: {
      threadId?: string;
      clientId?: string;
      timestamp?: Date;
      numberId?: string;
    }) =>
      apiPost<RoutingDecision>(
        '/api/routing/simulate',
        {
          ...params,
          timestamp: params.timestamp?.toISOString(),
        },
        routingDecisionSchema,
      ),
  });
}

// ============================================
// Routing Overrides
// ============================================

export function useCreateRoutingOverride() {
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
      queryClient.invalidateQueries({ queryKey: ['routing-history'] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useRemoveRoutingOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { overrideId: string; reason?: string }) =>
      apiDelete(`/api/routing/overrides/${params.overrideId}`, undefined, {
        body: params.reason ? JSON.stringify({ reason: params.reason }) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-history'] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}
