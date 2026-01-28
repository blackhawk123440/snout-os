/**
 * React Query hooks for Audit & Compliance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from './client';
import { z } from 'zod';

const auditEventSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  actorType: z.enum(['owner', 'sitter', 'client', 'system', 'automation']),
  actorId: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  eventType: z.string(),
  ts: z.string().transform((s) => new Date(s)),
  correlationIds: z.record(z.string()),
  payload: z.record(z.unknown()),
  schemaVersion: z.number(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;

export function useAuditEvents(filters?: {
  eventType?: string;
  actorType?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.eventType) queryParams.set('eventType', filters.eventType);
  if (filters?.actorType) queryParams.set('actorType', filters.actorType);
  if (filters?.entityType) queryParams.set('entityType', filters.entityType);
  if (filters?.entityId) queryParams.set('entityId', filters.entityId);
  if (filters?.startDate) queryParams.set('startDate', filters.startDate);
  if (filters?.endDate) queryParams.set('endDate', filters.endDate);
  if (filters?.search) queryParams.set('search', filters.search);
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());
  if (filters?.offset) queryParams.set('offset', filters.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/api/audit/events${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['audit-events', filters],
    queryFn: () =>
      apiGet<{ events: AuditEvent[]; total: number }>(endpoint, z.object({
        events: z.array(auditEventSchema),
        total: z.number(),
      })),
  });
}

const policyViolationSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  threadId: z.string(),
  messageId: z.string().nullable(),
  violationType: z.string(),
  detectedSummary: z.string(),
  detectedRedacted: z.string().nullable(),
  actionTaken: z.string(),
  status: z.enum(['open', 'resolved', 'dismissed']),
  createdAt: z.string().transform((s) => new Date(s)),
  resolvedByUserId: z.string().nullable(),
  resolvedAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  thread: z.object({
    id: z.string(),
    client: z.object({ id: z.string(), name: z.string() }),
    sitter: z.object({ id: z.string(), name: z.string() }).nullable(),
  }),
  message: z
    .object({
      id: z.string(),
      direction: z.string(),
      senderType: z.string(),
      body: z.string(),
      redactedBody: z.string().nullable(),
      createdAt: z.string().transform((s) => new Date(s)),
    })
    .nullable(),
});

export type PolicyViolation = z.infer<typeof policyViolationSchema>;

export function usePolicyViolations(filters?: {
  status?: string;
  threadId?: string;
  violationType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.threadId) queryParams.set('threadId', filters.threadId);
  if (filters?.violationType) queryParams.set('violationType', filters.violationType);
  if (filters?.startDate) queryParams.set('startDate', filters.startDate);
  if (filters?.endDate) queryParams.set('endDate', filters.endDate);
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());
  if (filters?.offset) queryParams.set('offset', filters.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/api/policy/violations${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['policy-violations', filters],
    queryFn: () =>
      apiGet<{ violations: PolicyViolation[]; total: number }>(
        endpoint,
        z.object({
          violations: z.array(policyViolationSchema),
          total: z.number(),
        }),
      ),
  });
}

export function usePolicyViolation(violationId: string | null) {
  return useQuery({
    queryKey: ['policy-violation', violationId],
    queryFn: () => apiGet<PolicyViolation>(`/api/policy/violations/${violationId}`, policyViolationSchema),
    enabled: !!violationId,
  });
}

export function useResolveViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (violationId: string) =>
      apiPost(`/api/policy/violations/${violationId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-violations'] });
    },
  });
}

export function useDismissViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (violationId: string) =>
      apiPost(`/api/policy/violations/${violationId}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-violations'] });
    },
  });
}

export function useOverrideViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { violationId: string; reason: string }) =>
      apiPost(`/api/policy/violations/${params.violationId}/override`, {
        reason: params.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-violations'] });
    },
  });
}

const deliveryFailureSchema = z.object({
  id: z.string(),
  attemptNo: z.number(),
  status: z.string(),
  providerErrorCode: z.string().nullable(),
  providerErrorMessage: z.string().nullable(),
  createdAt: z.string().transform((s) => new Date(s)),
  message: z.object({
    id: z.string(),
    threadId: z.string(),
    direction: z.string(),
    thread: z.object({
      id: z.string(),
      client: z.object({ id: z.string(), name: z.string() }),
      sitter: z.object({ id: z.string(), name: z.string() }).nullable(),
      messageNumber: z.object({
        id: z.string(),
        e164: z.string(),
        class: z.string(),
      }),
    }),
  }),
});

export type DeliveryFailure = z.infer<typeof deliveryFailureSchema>;

export function useDeliveryFailures(filters?: {
  threadId?: string;
  startDate?: string;
  endDate?: string;
  errorCode?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.threadId) queryParams.set('threadId', filters.threadId);
  if (filters?.startDate) queryParams.set('startDate', filters.startDate);
  if (filters?.endDate) queryParams.set('endDate', filters.endDate);
  if (filters?.errorCode) queryParams.set('errorCode', filters.errorCode);
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());
  if (filters?.offset) queryParams.set('offset', filters.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/api/deliveries/failures${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['delivery-failures', filters],
    queryFn: () =>
      apiGet<{ failures: DeliveryFailure[]; total: number }>(
        endpoint,
        z.object({
          failures: z.array(deliveryFailureSchema),
          total: z.number(),
        }),
      ),
  });
}

export function useRetryDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliveryId: string) => apiPost(`/api/deliveries/${deliveryId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-failures'] });
    },
  });
}

export function useResolveFailure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliveryId: string) => apiPost(`/api/deliveries/${deliveryId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-failures'] });
    },
  });
}

export function useResponseTimes(params: {
  startDate: string;
  endDate: string;
  groupBy: 'thread' | 'sitter';
}) {
  const queryParams = new URLSearchParams();
  queryParams.set('startDate', params.startDate);
  queryParams.set('endDate', params.endDate);
  queryParams.set('groupBy', params.groupBy);

  return useQuery({
    queryKey: ['response-times', params],
    queryFn: () =>
      apiGet<Array<{
        id: string;
        name: string;
        avgResponseTimeMinutes: number;
        responseCount: number;
        slaCompliant: number;
      }>>(`/api/analytics/response-times?${queryParams.toString()}`),
  });
}

export function useMessageVolume(params: {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'class';
}) {
  const queryParams = new URLSearchParams();
  queryParams.set('startDate', params.startDate);
  queryParams.set('endDate', params.endDate);
  queryParams.set('groupBy', params.groupBy);

  return useQuery({
    queryKey: ['message-volume', params],
    queryFn: () =>
      apiGet<Array<{ date?: string; class?: string; count: number }>>(
        `/api/analytics/message-volume?${queryParams.toString()}`,
      ),
  });
}
