// email-templates/components/send-test-modal.tsx
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useSendTestEmail } from '@/services/emailTemplates';

import type { EmailTemplate } from '../utils/types';

interface SendTestModalProps {
  template: EmailTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendTestModal({ template, open, onOpenChange }: SendTestModalProps) {
  const [email, setEmail] = React.useState('');
  const [variables, setVariables] = React.useState<Record<string, string>>({});

  const sendTestMutation = useSendTestEmail();

  React.useEffect(() => {
    if (template && open) {
      // Initialize variables with empty values
      const initialVars: Record<string, string> = {};
      template.variables.forEach((variable) => {
        initialVars[variable] = '';
      });
      setVariables(initialVars);
    }
  }, [template, open]);

  const handleSend = () => {
    if (!template || !email) return;

    // Filter out empty variables
    const filledVariables: Record<string, unknown> = {};
    Object.entries(variables).forEach(([key, value]) => {
      if (value.trim()) {
        filledVariables[key] = value.trim();
      }
    });

    sendTestMutation.mutate(
      {
        templateId: template.id,
        body: {
          to: email,
          variables: filledVariables,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setEmail('');
          setVariables({});
        },
      }
    );
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Gửi email test</DialogTitle>
          <DialogDescription>
            Gửi email test cho template &quot;{template.name}&quot; để kiểm tra hiển thị.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div>
            <Label htmlFor='test-email'>Email nhận test</Label>
            <Input
              id='test-email'
              type='email'
              placeholder='test@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {template.variables.length > 0 && (
            <div>
              <Label>Biến mẫu (tùy chọn)</Label>
              <div className='mt-2 space-y-2'>
                {template.variables.map((variable) => (
                  <div key={variable} className='flex items-center gap-2'>
                    <Label htmlFor={`var-${variable}`} className='min-w-0 flex-1'>
                      {variable}:
                    </Label>
                    <Input
                      id={`var-${variable}`}
                      placeholder={`Giá trị cho ${variable}`}
                      value={variables[variable] || ''}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      className='flex-1'
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={sendTestMutation.isPending}
          >
            Hủy
          </Button>
          <Button onClick={handleSend} disabled={!email || sendTestMutation.isPending}>
            {sendTestMutation.isPending ? 'Đang gửi...' : 'Gửi test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
