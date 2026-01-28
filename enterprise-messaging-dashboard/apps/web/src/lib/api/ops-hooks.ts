/**
 * React Query hooks for Ops (DLQ, Health)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from './client';
import { z } from 'zod';

const dlqJobSchema = z.object({
  id: z.string(),
  queue: z.string(),
  name: z.string(),
  data: z.record(z.unknown()),
  attemptsMade: z.number(),
  failedReason: z.string().nullable(),
  timestamp: z.number(),
  processedOn: z.number().nullable(),
  finishedOn: z.number().nullable(),
  orgId: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
});

export type DLQJob = z.infer<typeof dlqJobSchema>;

const healthSchema = z.object({
  provider: z.object({
    type: z.string(),
    connected: z.boolean(),
    lastCheck: z.string().nullable(),
  }),
  webhooks: z.object({
    lastReceived: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
    lastEventType: z.string().nullable(),
  }),
  queues: z.object({
    messageRetry: z.object({
      waiting: z.number(),
      active: z.number(),
      failed: z.number(),
    }),
    automation: z.object({
      waiting: z.number(),
      active: z.number(),
      failed: z.number(),
    }),
  }),
  database: z.object({
    latencyMs: z.number(),
    status: z.string(),
  }),
});

export type HealthStatus = z.infer<typeof healthSchema>;

export function useDLQJobs() {
  return useQuery({
    queryKey: ['dlq-jobs'],
    queryFn: () => apiGet<DLQJob[]>('/api/ops/dlq', z.array(dlqJobSchema)),
    refetchInterval: 10000, // Poll every 10s
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet<HealthStatus>('/api/ops/health', healthSchema),
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useReplayDLQJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { queueName: string; jobId: string; reason?: string }) =>
      apiPost(`/api/ops/dlq/${params.queueName}/${params.jobId}/replay`, { reason: params.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq-jobs'] });
    },
  });
}

export function useIgnoreDLQJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { queueName: string; jobId: string; reason?: string }) =>
      apiPost(`/api/ops/dlq/${params.queueName}/${params.jobId}/ignore`, { reason: params.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq-jobs'] });
    },
  });
}
