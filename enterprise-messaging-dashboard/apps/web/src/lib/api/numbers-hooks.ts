/**
 * React Query hooks for Number Inventory
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from './client';
import { z } from 'zod';

const numberSchema = z.object({
  id: z.string(),
  e164: z.string(),
  class: z.enum(['front_desk', 'sitter', 'pool']),
  status: z.enum(['active', 'quarantined', 'inactive']),
  assignedSitterId: z.string().nullable(),
  quarantinedReason: z.string().nullable(),
  quarantineReleaseAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  providerType: z.string(),
  providerNumberSid: z.string().nullable(),
  purchaseCostCents: z.number().nullable(),
  purchaseDate: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  lastUsedAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  assignedSitter: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  health: z
    .object({
      status: z.enum(['healthy', 'degraded', 'critical']),
      deliveryErrors7d: z.number(),
      messages7d: z.number(),
      errorRate: z.number(),
    })
    .optional(),
});

export type Number = z.infer<typeof numberSchema>;

export function useNumbers(filters?: {
  class?: string[];
  status?: string[];
  assignedSitterId?: string;
  search?: string;
  health?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (filters?.class) {
    filters.class.forEach((c) => queryParams.append('class', c));
  }
  if (filters?.status) {
    filters.status.forEach((s) => queryParams.append('status', s));
  }
  if (filters?.assignedSitterId) queryParams.set('assignedSitterId', filters.assignedSitterId);
  if (filters?.search) queryParams.set('search', filters.search);
  if (filters?.health) queryParams.set('health', filters.health);
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());
  if (filters?.offset) queryParams.set('offset', filters.offset.toString());
  if (filters?.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters?.sortOrder) queryParams.set('sortOrder', filters.sortOrder);

  const queryString = queryParams.toString();
  const endpoint = `/api/numbers${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['numbers', filters],
    queryFn: () => apiGet<Number[]>(endpoint, z.array(numberSchema)),
  });
}

export function useNumber(numberId: string | null) {
  return useQuery({
    queryKey: ['number', numberId],
    queryFn: () => apiGet<Number & { activeThreadCount: number; deliveryErrors: any[] }>(
      `/api/numbers/${numberId}`,
    ),
    enabled: !!numberId,
  });
}

export function useImpactPreview(numberId: string | null, action: string) {
  return useQuery({
    queryKey: ['number-impact', numberId, action],
    queryFn: () => apiGet(`/api/numbers/${numberId}/impact?action=${action}`),
    enabled: !!numberId && !!action,
  });
}

export function useSitters() {
  return useQuery({
    queryKey: ['sitters'],
    queryFn: () => apiGet<Array<{ id: string; name: string }>>('/api/numbers/sitters'),
  });
}

export function useBuyNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { e164: string; class: string }) =>
      apiPost('/api/numbers/buy', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
    },
  });
}

export function useImportNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { e164: string; class: string }) =>
      apiPost('/api/numbers/import', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
    },
  });
}

export function useBulkImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { numbers: Array<{ e164: string; class: string }> }) =>
      apiPost('/api/numbers/bulk-import', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
    },
  });
}

export function useAssignToSitter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { numberId: string; sitterId: string }) =>
      apiPost(`/api/numbers/${params.numberId}/assign-to-sitter`, { sitterId: params.sitterId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      queryClient.invalidateQueries({ queryKey: ['number'] });
    },
  });
}

export function useReleaseToPool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (numberId: string) => apiPost(`/api/numbers/${numberId}/release-to-pool`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      queryClient.invalidateQueries({ queryKey: ['number'] });
    },
  });
}

export function useQuarantineNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { numberId: string; reason: string; reasonDetail?: string }) =>
      apiPost(`/api/numbers/${params.numberId}/quarantine`, {
        reason: params.reason,
        reasonDetail: params.reasonDetail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      queryClient.invalidateQueries({ queryKey: ['number'] });
    },
  });
}

export function useBulkQuarantine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      numberIds: string[];
      reason: string;
      reasonDetail?: string;
    }) => apiPost('/api/numbers/bulk-quarantine', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
    },
  });
}

export function useReleaseFromQuarantine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (numberId: string) =>
      apiPost(`/api/numbers/${numberId}/release-from-quarantine`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      queryClient.invalidateQueries({ queryKey: ['number'] });
    },
  });
}
