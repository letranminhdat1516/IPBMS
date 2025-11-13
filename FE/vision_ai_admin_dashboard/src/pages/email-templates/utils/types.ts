// email-templates/utils/types.ts
export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject_template: string;
  html_template: string;
  text_template: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updatedBy?: string;
}

export interface EmailTemplateFormData {
  name: string;
  type: 'password_reset' | 'welcome' | 'subscription_expiry' | 'security_alert';
  subject_template: string;
  html_template: string;
  text_template: string;
  is_active: boolean;
}

export interface EmailPreviewData {
  subject: string;
  html: string;
  text: string;
}

export interface SendTestEmailData {
  templateId: string;
  email: string;
  variables?: Record<string, unknown>;
}
