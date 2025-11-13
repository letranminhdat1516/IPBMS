import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

export type AIConfiguration = {
  id?: string;
  user_id: string;
  model_name: string;
  threshold: number;
  enabled_features: string[];
  processing_interval: number;
  alert_on_detection: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CreateAIConfigRequest = {
  user_id: string;
  model_name: string;
  threshold: number;
  enabled_features: string[];
  processing_interval: number;
  alert_on_detection: boolean;
};

export type UpdateAIConfigRequest = Partial<CreateAIConfigRequest>;

export function getAIConfigurations(params?: { user_id?: string }) {
  return api.get<AIConfiguration[]>('/ai-configurations', params);
}

export function useAIConfigurations(params?: { user_id?: string }) {
  return useQuery({
    queryKey: ['ai-configurations', params],
    queryFn: () => getAIConfigurations(params),
  });
}

export function createAIConfiguration(body: CreateAIConfigRequest) {
  return api.post<AIConfiguration>('/ai-configurations', body);
}

export function useCreateAIConfiguration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAIConfigRequest) => createAIConfiguration(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-configurations'] });
    },
  });
}

export function updateAIConfiguration(id: string, body: UpdateAIConfigRequest) {
  return api.put<AIConfiguration>(`/ai-configurations/${id}`, body);
}

export function useUpdateAIConfiguration(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAIConfigRequest) => updateAIConfiguration(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-configurations'] });
    },
  });
}

export function deleteAIConfiguration(id: string) {
  return api.delete<{ deleted: boolean }>(`/ai-configurations/${id}`);
}

export function useDeleteAIConfiguration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAIConfiguration(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-configurations'] });
    },
  });
}
