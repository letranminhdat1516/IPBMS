// email-templates/components/email-preview-modal.tsx
import React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getEmailPreview, htmlToPlainText } from '../utils/preview';
import type { EmailTemplate } from '../utils/types';

interface EmailPreviewModalProps {
  template: EmailTemplate | null;
  variables?: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailPreviewModal({
  template,
  variables = {},
  open,
  onOpenChange,
}: EmailPreviewModalProps) {
  const [previewHtml, setPreviewHtml] = React.useState<string>('');
  const [previewText, setPreviewText] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (template && open) {
      setLoading(true);

      // Render template with variables
      let html = template.html_template;
      let text = template.text_template;
      let subject = template.subject_template;

      // Replace variables
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const strValue = String(value);
        html = html.replace(regex, strValue);
        text = text.replace(regex, strValue);
        subject = subject.replace(regex, strValue);
      });

      // Generate preview
      Promise.all([getEmailPreview(html), Promise.resolve(text || htmlToPlainText(html))])
        .then(([processedHtml, processedText]) => {
          setPreviewHtml(processedHtml);
          setPreviewText(processedText);
        })
        .catch(() => {
          setPreviewHtml('Lỗi tải preview');
          setPreviewText('Lỗi tải preview');
        })
        .finally(() => setLoading(false));
    }
  }, [template, variables, open]);

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Xem trước: {template.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue='html' className='flex-1'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='html'>HTML Version</TabsTrigger>
            <TabsTrigger value='text'>Text Version</TabsTrigger>
          </TabsList>

          <TabsContent value='html' className='mt-4'>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-medium'>Tiêu đề:</label>
                <div className='bg-muted mt-1 rounded p-3 text-sm'>{template.subject_template}</div>
              </div>

              <Separator />

              <div>
                <label className='text-sm font-medium'>Nội dung HTML:</label>
                <ScrollArea className='mt-2 h-96'>
                  <div className='rounded border p-4'>
                    {loading ? (
                      <div className='text-muted-foreground text-center'>Đang tải preview...</div>
                    ) : (
                      <div
                        className='prose prose-sm max-w-none'
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='text' className='mt-4'>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-medium'>Tiêu đề:</label>
                <div className='bg-muted mt-1 rounded p-3 text-sm'>{template.subject_template}</div>
              </div>

              <Separator />

              <div>
                <label className='text-sm font-medium'>Nội dung Text:</label>
                <ScrollArea className='mt-2 h-96'>
                  <div className='rounded border p-4 font-mono text-sm whitespace-pre-wrap'>
                    {loading ? 'Đang tải preview...' : previewText}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
