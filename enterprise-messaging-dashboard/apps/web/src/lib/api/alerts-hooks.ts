/**
 * React Query hooks for Alerts & Escalation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from './client';
import { z } from 'zod';

const alertSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  severity: z.enum(['critical', 'warning', 'info']),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  status: z.enum(['open', 'resolved', 'dismissed']),
  createdAt: z.string().transform((s) => new Date(s)),
  resolvedAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  resolvedByUserId: z.string().nullable(),
});

export type Alert = z.infer<typeof alertSchema>;

export function useAlerts(filters?: {
  severity?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.severity) queryParams.set('severity', filters.severity);
  if (filters?.type) queryParams.set('type', filters.type);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.startDate) queryParams.set('startDate', filters.startDate);
  if (filters?.endDate) queryParams.set('endDate', filters.endDate);
  if (filters?.search) queryParams.set('search', filters.search);
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());
  if (filters?.offset) queryParams.set('offset', filters.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/api/alerts${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: () =>
      apiGet<{ alerts: Alert[]; total: number }>(
        endpoint,
        z.object({
          alerts: z.array(alertSchema),
          total: z.number(),
        }),
      ),
  });
}

export function useAlert(alertId: string | null) {
  return useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => apiGet<Alert>(`/api/alerts/${alertId}`, alertSchema),
    enabled: !!alertId,
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => apiPost(`/api/alerts/${alertId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { alertId: string; reason?: string }) =>
      apiPost(`/api/alerts/${params.alertId}/dismiss`, { reason: params.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
