// email-templates/components/email-template-dialog.tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';

import { useCreateEmailTemplate, useUpdateEmailTemplate } from '@/services/emailTemplates';

import type { EmailTemplate, EmailTemplateFormData } from '../utils/types';
import { EmailTemplateForm } from './email-template-form';

interface EmailTemplateDialogProps {
  template?: EmailTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EmailTemplateDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: EmailTemplateDialogProps) {
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();

  const handleSubmit = (data: EmailTemplateFormData) => {
    if (template) {
      updateMutation.mutate(
        { templateId: template.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      });
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='ring-border max-h-[92vh] !w-full !max-w-none min-w-0 overflow-x-hidden overflow-y-auto rounded-xl p-0 shadow-2xl ring-1 sm:!w-[720px] md:!w-[920px]'>
        <div className='flex h-full min-w-0 flex-col'>
          <div className='min-w-0 flex-1 overflow-y-auto px-12 py-4'>
            <EmailTemplateForm
              template={template}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={isLoading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
