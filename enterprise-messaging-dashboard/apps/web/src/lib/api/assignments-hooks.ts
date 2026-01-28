/**
 * React Query hooks for Assignments & Windows
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { z } from 'zod';

const assignmentWindowSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  threadId: z.string(),
  sitterId: z.string(),
  startsAt: z.string().transform((s) => new Date(s)),
  endsAt: z.string().transform((s) => new Date(s)),
  bookingRef: z.string().nullable(),
  createdAt: z.string().transform((s) => new Date(s)),
  status: z.enum(['active', 'future', 'past']),
  thread: z.object({
    id: z.string(),
    client: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
  sitter: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export type AssignmentWindow = z.infer<typeof assignmentWindowSchema>;

const conflictSchema = z.object({
  windowA: assignmentWindowSchema,
  windowB: assignmentWindowSchema,
  overlapStart: z.string().transform((s) => new Date(s)),
  overlapEnd: z.string().transform((s) => new Date(s)),
  conflictId: z.string(),
});

export type Conflict = z.infer<typeof conflictSchema>;

export function useAssignmentWindows(filters?: {
  threadId?: string;
  sitterId?: string;
  status?: 'active' | 'future' | 'past';
  startDate?: string;
  endDate?: string;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.threadId) queryParams.set('threadId', filters.threadId);
  if (filters?.sitterId) queryParams.set('sitterId', filters.sitterId);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.startDate) queryParams.set('startDate', filters.startDate);
  if (filters?.endDate) queryParams.set('endDate', filters.endDate);

  const queryString = queryParams.toString();
  const endpoint = `/api/assignments/windows${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['assignment-windows', filters],
    queryFn: () => apiGet<AssignmentWindow[]>(endpoint, z.array(assignmentWindowSchema)),
  });
}

export function useAssignmentWindow(windowId: string | null) {
  return useQuery({
    queryKey: ['assignment-window', windowId],
    queryFn: () => apiGet<AssignmentWindow>(`/api/assignments/windows/${windowId}`, assignmentWindowSchema),
    enabled: !!windowId,
  });
}

export function useConflicts() {
  return useQuery({
    queryKey: ['assignment-conflicts'],
    queryFn: () => apiGet<Conflict[]>(`/api/assignments/conflicts`, z.array(conflictSchema)),
  });
}

export function useCreateWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      threadId: string;
      sitterId: string;
      startsAt: string; // ISO string
      endsAt: string; // ISO string
      bookingRef?: string;
    }) => apiPost<AssignmentWindow>('/api/assignments/windows', params, assignmentWindowSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-windows'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useUpdateWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      windowId: string;
      startsAt?: string;
      endsAt?: string;
      sitterId?: string;
      bookingRef?: string;
    }) => {
      const { windowId, ...body } = params;
      return apiPatch<AssignmentWindow>(`/api/assignments/windows/${windowId}`, body, assignmentWindowSchema);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-windows'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useDeleteWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (windowId: string) => apiDelete(`/api/assignments/windows/${windowId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-windows'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { conflictId: string; strategy: 'keepA' | 'keepB' | 'split' }) =>
      apiPost(`/api/assignments/conflicts/${params.conflictId}/resolve`, { strategy: params.strategy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-windows'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-conflicts'] });
    },
  });
}

export function useSendReassignmentMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { threadId: string; windowId: string; templateId?: string }) =>
      apiPost('/api/assignments/reassignment-message', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
