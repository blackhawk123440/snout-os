/**
 * React Query hooks for Automations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from './client';
import { z } from 'zod';

const automationSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  lane: z.enum(['front_desk', 'sitter', 'billing', 'system']),
  status: z.enum(['draft', 'active', 'paused', 'archived']),
  trigger: z.record(z.unknown()),
  conditions: z.record(z.unknown()),
  actions: z.array(z.unknown()),
  templates: z.record(z.unknown()),
  lastExecutedAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  lastTestedAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  updatedAt: z.string().transform((s) => new Date(s)),
  createdAt: z.string().transform((s) => new Date(s)),
  executionCount24h: z.number().optional(),
});

export type Automation = z.infer<typeof automationSchema>;

const executionLogSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  automationId: z.string(),
  status: z.enum(['success', 'failed', 'skipped', 'test']),
  triggerContext: z.record(z.unknown()),
  conditionResults: z.record(z.unknown()).nullable(),
  actionResults: z.record(z.unknown()).nullable(),
  error: z.string().nullable(),
  createdAt: z.string().transform((s) => new Date(s)),
});

export type AutomationExecution = z.infer<typeof executionLogSchema>;

export function useAutomations(filters?: {
  status?: string;
  lane?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.lane) queryParams.set('lane', filters.lane);
  if (filters?.search) queryParams.set('search', filters.search);
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());
  if (filters?.offset) queryParams.set('offset', filters.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/api/automations${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['automations', filters],
    queryFn: () => apiGet<Automation[]>(endpoint, z.array(automationSchema)),
  });
}

export function useAutomation(automationId: string | null) {
  return useQuery({
    queryKey: ['automation', automationId],
    queryFn: () => apiGet<Automation>(`/api/automations/${automationId}`, automationSchema),
    enabled: !!automationId,
  });
}

export function useExecutionLogs(
  automationId: string | null,
  filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  },
) {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.startDate) queryParams.set('startDate', filters.startDate);
  if (filters?.endDate) queryParams.set('endDate', filters.endDate);
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());
  if (filters?.offset) queryParams.set('offset', filters.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/api/automations/${automationId}/logs${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['automation-logs', automationId, filters],
    queryFn: () =>
      apiGet<{ logs: AutomationExecution[]; total: number }>(
        endpoint,
        z.object({
          logs: z.array(executionLogSchema),
          total: z.number(),
        }),
      ),
    enabled: !!automationId,
  });
}

export function useExecutionLog(executionId: string | null) {
  return useQuery({
    queryKey: ['execution-log', executionId],
    queryFn: () =>
      apiGet<AutomationExecution & { automation: Automation }>(
        `/api/automations/executions/${executionId}`,
      ),
    enabled: !!executionId,
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      lane: string;
      trigger: any;
      conditions: any;
      actions: any;
      templates: any;
    }) => apiPost('/api/automations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      automationId: string;
      data: {
        name?: string;
        description?: string;
        lane?: string;
        trigger?: any;
        conditions?: any;
        actions?: any;
        templates?: any;
      };
    }) => apiPatch(`/api/automations/${params.automationId}`, params.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automation', variables.automationId] });
    },
  });
}

export function usePauseAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (automationId: string) => apiPost(`/api/automations/${automationId}/pause`),
    onSuccess: (_, automationId) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automation', automationId] });
    },
  });
}

export function useActivateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (automationId: string) => apiPost(`/api/automations/${automationId}/activate`),
    onSuccess: (_, automationId) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automation', automationId] });
    },
  });
}

export function useArchiveAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (automationId: string) => apiPost(`/api/automations/${automationId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });
}

export function useTestAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      automationId: string;
      context: Record<string, unknown>;
    }) =>
      apiPost<{
        status: string;
        conditionResults: any;
        actionPlan: any;
        renderedTemplates: any;
        executionId: string;
      }>(`/api/automations/${params.automationId}/test`, { context: params.context }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automation', variables.automationId] });
      queryClient.invalidateQueries({ queryKey: ['automation-logs', variables.automationId] });
    },
  });
}
