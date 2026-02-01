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
  assignedSitter: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable(),
  providerType: z.string(),
  purchaseDate: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  // Pool state
  activeThreadCount: z.number().nullable().optional(),
  capacityStatus: z.string().nullable().optional(),
  maxConcurrentThreads: z.number().nullable().optional(),
});

export type Number = z.infer<typeof numberSchema>;

export function useNumbers(filters?: {
  class?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['numbers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.class) params.set('class', filters.class);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      return apiGet(`/api/numbers?${params.toString()}`, z.array(numberSchema));
    },
  });
}

export function useBuyNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      class: 'front_desk' | 'sitter' | 'pool';
      areaCode?: string;
      country?: string;
      quantity?: number;
    }) => apiPost('/api/numbers/buy', params, z.object({
      success: z.boolean(),
      numbers: z.array(z.object({
        id: z.string(),
        e164: z.string(),
        numberSid: z.string(),
        cost: z.number(),
      })),
      totalCost: z.number().optional(),
    })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      queryClient.invalidateQueries({ queryKey: ['setup', 'numbers'] });
    },
  });
}

export function useImportNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      e164?: string;
      numberSid?: string;
      class: 'front_desk' | 'sitter' | 'pool';
    }) => apiPost('/api/numbers/import', params, z.object({
      success: z.boolean(),
      number: z.object({
        id: z.string(),
        e164: z.string(),
        numberSid: z.string(),
      }),
    })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      queryClient.invalidateQueries({ queryKey: ['setup', 'numbers'] });
    },
  });
}

export function useQuarantineNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      numberId: string;
      reason: string;
      reasonDetail?: string;
    }) => apiPost(`/api/numbers/${params.numberId}/quarantine`, {
      reason: params.reason,
      reasonDetail: params.reasonDetail,
    }, z.object({
      success: z.boolean(),
      impact: z.object({
        affectedThreads: z.number(),
        cooldownDays: z.number(),
        releaseAt: z.string(),
        message: z.string(),
      }),
    })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
    },
  });
}

export function useReleaseNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (numberId: string) => apiPost(`/api/numbers/${numberId}/release`, {}, z.object({
      success: z.boolean(),
      message: z.string(),
    })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
    },
  });
}

export function useAssignToSitter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      numberId: string;
      sitterId: string;
    }) => apiPost(`/api/numbers/${params.numberId}/assign`, {
      sitterId: params.sitterId,
    }, z.object({
      success: z.boolean(),
      message: z.string(),
    })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
    },
  });
}

export function useReleaseToPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (numberId: string) => apiPost(`/api/numbers/${numberId}/release-to-pool`, {}, z.object({
      success: z.boolean(),
      impact: z.object({
        affectedThreads: z.number(),
        message: z.string(),
      }),
    })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
    },
  });
}

export function useSitters() {
  return useQuery({
    queryKey: ['sitters'],
    queryFn: () => apiGet('/api/sitters', z.array(z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
    }))),
  });
}
