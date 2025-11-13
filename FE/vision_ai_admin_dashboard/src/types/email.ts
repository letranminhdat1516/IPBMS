import { z } from 'zod';

// Email template types
export type EmailTemplateType =
  | 'password_reset'
  | 'welcome'
  | 'subscription_expiry'
  | 'security_alert';

export type EmailTemplateStatus = 'active' | 'inactive';

// Email template interface
export interface EmailTemplate {
  id: string;
  name: string;
  type: EmailTemplateType;
  subject_template: string;
  html_template: string;
  text_template: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  createdBy?: string;
  updatedBy?: string;
}

// Create email template DTO
export const CreateEmailTemplateDtoSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  type: z.enum(['password_reset', 'welcome', 'subscription_expiry', 'security_alert']),
  subject_template: z.string().min(1, 'Subject is required'),
  html_template: z.string().min(1, 'HTML content is required'),
  text_template: z.string().min(1, 'Text content is required'),
  is_active: z.boolean().default(true),
});

export type CreateEmailTemplateDto = z.infer<typeof CreateEmailTemplateDtoSchema>;

// Update email template DTO
export const UpdateEmailTemplateDtoSchema = z.object({
  name: z.string().min(1, 'Template name is required').optional(),
  type: z.enum(['password_reset', 'welcome', 'subscription_expiry', 'security_alert']).optional(),
  subject_template: z.string().min(1, 'Subject is required').optional(),
  html_template: z.string().min(1, 'HTML content is required').optional(),
  text_template: z.string().min(1, 'Text content is required').optional(),
  is_active: z.boolean().optional(),
});

export type UpdateEmailTemplateDto = z.infer<typeof UpdateEmailTemplateDtoSchema>;

// Render template DTO
export const RenderTemplateDtoSchema = z.object({
  variables: z.record(z.string(), z.any()).optional(),
});

export type RenderTemplateDto = z.infer<typeof RenderTemplateDtoSchema>;

// Rendered email template
export interface RenderedEmailTemplate {
  subject: string;
  content: string;
  variables: string[];
}

// Email template list response
export interface EmailTemplateListResponse {
  data: EmailTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Email template types response
export interface EmailTemplateTypesResponse {
  types: Array<{
    value: EmailTemplateType;
    label: string;
    description: string;
    defaultVariables: string[];
  }>;
}
