/**
 * React Query hooks for Setup Wizard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from './client';
import { z } from 'zod';
import {
  testConnectionResponseSchema,
  providerStatusSchema,
  buyNumberResponseSchema,
  numbersStatusSchema,
  webhookStatusSchema,
  readinessCheckSchema,
  setupProgressSchema,
} from '@snoutos/shared';

export function useProviderStatus() {
  return useQuery({
    queryKey: ['setup', 'provider-status'],
    queryFn: () => apiGet('/api/setup/provider/status', providerStatusSchema),
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (config?: { accountSid?: string; authToken?: string }) =>
      apiPost('/api/setup/provider/test', config, testConnectionResponseSchema),
  });
}

export function useConnectProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: { accountSid: string; authToken: string }) =>
      apiPost('/api/setup/provider/connect', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] });
    },
  });
}

export function useBuyNumbers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      class: 'front_desk' | 'sitter' | 'pool';
      areaCode?: string;
      country?: string;
      quantity?: number;
    }) => apiPost('/api/setup/numbers/buy', params, buyNumberResponseSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup', 'numbers'] });
    },
  });
}

export function useImportNumbers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      class: 'front_desk' | 'sitter' | 'pool';
      e164s?: string[];
      numberSids?: string[];
    }) => apiPost('/api/setup/numbers/import', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup', 'numbers'] });
    },
  });
}

export function useNumbersStatus() {
  return useQuery({
    queryKey: ['setup', 'numbers-status'],
    queryFn: () => apiGet('/api/setup/numbers/status', numbersStatusSchema),
  });
}

export function useInstallWebhooks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost('/api/setup/webhooks/install'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup', 'webhooks'] });
    },
  });
}

export function useWebhookStatus() {
  return useQuery({
    queryKey: ['setup', 'webhook-status'],
    queryFn: () => apiGet('/api/setup/webhooks/status', webhookStatusSchema),
    refetchInterval: 2000, // Poll every 2s during setup
  });
}

export function useReadiness() {
  return useQuery({
    queryKey: ['setup', 'readiness'],
    queryFn: () => apiGet('/api/setup/readiness', readinessCheckSchema),
    refetchInterval: 2000,
  });
}

export function useSetupProgress() {
  return useQuery({
    queryKey: ['setup', 'progress'],
    queryFn: () => apiGet('/api/setup/progress', setupProgressSchema),
  });
}

export function useSaveSetupProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (progress: { step: number; data?: Record<string, unknown> }) =>
      apiPost('/api/setup/progress', progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup', 'progress'] });
    },
  });
}

export function useFinishSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost('/api/setup/finish'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] });
    },
  });
}
