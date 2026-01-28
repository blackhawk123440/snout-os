/**
 * React Query hooks for Sitter API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from './client';
import { z } from 'zod';

const sitterThreadSchema = z.object({
  id: z.string(),
  client: z.object({
    id: z.string(),
    name: z.string(),
  }),
  messageNumber: z.object({
    id: z.string(),
    e164: z.string(), // Masked business number
    class: z.string(),
  }),
  unreadCount: z.number(),
  lastActivityAt: z.string().transform((s) => new Date(s)),
  window: z.object({
    id: z.string(),
    startsAt: z.string().transform((s) => new Date(s)),
    endsAt: z.string().transform((s) => new Date(s)),
    isActive: z.boolean(),
  }),
});

export type SitterThread = z.infer<typeof sitterThreadSchema>;

const sitterMessageSchema = z.object({
  id: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  senderType: z.string().nullable(),
  body: z.string(),
  createdAt: z.string().transform((s) => new Date(s)),
  readAt: z.string().nullable().transform((s) => (s ? new Date(s) : null)),
  hasPolicyViolation: z.boolean(),
  senderLabel: z.string(),
});

export type SitterMessage = z.infer<typeof sitterMessageSchema>;

export function useSitterThreads(enabled: boolean = true) {
  return useQuery({
    queryKey: ['sitter-threads'],
    queryFn: () => apiGet<SitterThread[]>('/api/sitter/threads', z.array(sitterThreadSchema)),
    refetchInterval: enabled ? 5000 : false, // Poll every 5s when enabled
    enabled,
  });
}

export function useSitterThread(threadId: string | null) {
  return useQuery({
    queryKey: ['sitter-thread', threadId],
    queryFn: () => apiGet<SitterThread>(`/api/sitter/threads/${threadId}`, sitterThreadSchema),
    enabled: !!threadId,
  });
}

export function useSitterMessages(threadId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['sitter-messages', threadId],
    queryFn: () =>
      apiGet<SitterMessage[]>(`/api/sitter/threads/${threadId}/messages`, z.array(sitterMessageSchema)),
    enabled: !!threadId && enabled,
    refetchInterval: enabled ? 3000 : false, // Poll every 3s when enabled
  });
}

export function useSitterSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { threadId: string; body: string }) =>
      apiPost(`/api/sitter/threads/${params.threadId}/messages`, { body: params.body }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sitter-messages', variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ['sitter-threads'] });
    },
  });
}

export function useSitterMarkThreadAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => apiPatch(`/api/sitter/threads/${threadId}/mark-read`),
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ['sitter-thread', threadId] });
      queryClient.invalidateQueries({ queryKey: ['sitter-threads'] });
    },
  });
}
