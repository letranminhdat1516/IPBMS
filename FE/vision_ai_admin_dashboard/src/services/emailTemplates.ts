import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

import type {
  CreateEmailTemplateDto,
  EmailTemplate,
  EmailTemplateTypesResponse,
  RenderTemplateDto,
  RenderedEmailTemplate,
  UpdateEmailTemplateDto,
} from '@/types/email';

export type EmailTemplateFilters = {
  page?: number;
  limit?: number;
  type?: string;
  isActive?: boolean;
  search?: string;
};

// Get all email templates
export function getEmailTemplates(params?: EmailTemplateFilters) {
  // API may return either a wrapped paginated response or a plain array.
  // Normalize both formats into the EmailTemplateListResponse shape used by the UI.
  return api
    .get<
      | EmailTemplate[]
      | { data: EmailTemplate[]; total: number; page: number; limit: number; totalPages: number }
    >('/admin/email-templates', params)
    .then((res) => {
      // If API returned a paginated object, normalize keys in data and metadata
      if (res && typeof res === 'object' && 'data' in res) {
        const possible = res as unknown as { data?: unknown };
        if (Array.isArray(possible.data)) {
          return res as {
            data: EmailTemplate[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
          };
        }
      }

      // Otherwise assume it's a plain array and synthesize pagination metadata (keep original keys)
      const arr = (res as EmailTemplate[]) || [];
      const limit = params?.limit ?? 10;
      const page = params?.page ?? 1;
      return {
        data: arr,
        total: arr.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(arr.length / limit)),
      };
    });
}

// Get email template by ID
export function getEmailTemplateById(templateId: string) {
  return api.get<EmailTemplate>(`/admin/email-templates/${templateId}`);
}

// Create new email template
export function createEmailTemplate(data: CreateEmailTemplateDto) {
  return api.post<EmailTemplate>('/admin/email-templates', data);
}

// Update email template
export function updateEmailTemplate(templateId: string, data: UpdateEmailTemplateDto) {
  return api.patch<EmailTemplate>(`/admin/email-templates/${templateId}`, data);
}

// Toggle email template status
export function toggleEmailTemplate(templateId: string) {
  return api.put<EmailTemplate>(`/admin/email-templates/${templateId}/toggle`);
}

// Delete email template
export function deleteEmailTemplate(templateId: string) {
  return api.delete(`/admin/email-templates/${templateId}`);
}

// Duplicate email template
export function duplicateEmailTemplate(templateId: string) {
  return api.post<EmailTemplate>(`/admin/email-templates/${templateId}/duplicate`);
}

// Get email template types
export function getEmailTemplateTypes() {
  return api.get<EmailTemplateTypesResponse>('/admin/email-templates/types');
}

// Render email template
export function renderEmailTemplate(templateId: string, data: RenderTemplateDto) {
  return api.post<RenderedEmailTemplate>(`/admin/email-templates/${templateId}/render`, data);
}

// React Query hooks
export function useEmailTemplates(params?: EmailTemplateFilters) {
  return useQuery({
    queryKey: ['email-templates', params],
    queryFn: () => getEmailTemplates(params),
  });
}

export function useEmailTemplate(templateId: string) {
  return useQuery({
    queryKey: ['email-template', templateId],
    queryFn: () => getEmailTemplateById(templateId),
    enabled: !!templateId,
  });
}

export function useEmailTemplateTypes() {
  return useQuery({
    queryKey: ['email-template-types'],
    queryFn: () => getEmailTemplateTypes(),
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmailTemplateDto) => createEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateEmailTemplateDto }) =>
      updateEmailTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['email-template'] });
    },
  });
}

export function useToggleEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => toggleEmailTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['email-template'] });
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteEmailTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });
}

export function useDuplicateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => duplicateEmailTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });
}

export function useRenderEmailTemplate() {
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: RenderTemplateDto }) =>
      renderEmailTemplate(templateId, data),
  });
}

// Send test email for a template (best-effort; backend must support this endpoint)
export function sendTestEmail(
  templateId: string,
  body: { to: string; variables?: Record<string, unknown> }
) {
  return api.post<{ sent: boolean }>(`/admin/email-templates/${templateId}/send-test`, body);
}

export function useSendTestEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      body,
    }: {
      templateId: string;
      body: { to: string; variables?: Record<string, unknown> };
    }) => sendTestEmail(templateId, body),
    onSuccess: () => {
      // Invalidate list in case backend records logs / metrics
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['email-template'] });
    },
  });
}
