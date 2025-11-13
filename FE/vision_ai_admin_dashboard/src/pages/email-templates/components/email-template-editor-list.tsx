import { Copy, Eye, Save, Send, Upload } from 'lucide-react';
import { toast } from 'sonner';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea as DialogTextarea } from '@/components/ui/textarea';

import RichTextEditor from '@/components/rich-text-editor';

import type { EmailTemplate } from '@/types/email';

import { getPreviewHtml } from '@/utils/preview-utils';

import { useSendTestEmail, useUpdateEmailTemplate } from '@/services/emailTemplates';

import { EmailPreviewModal as EmailTemplatePreviewModal } from './email-preview-modal';
import EmailTemplateHtmlEditor, { type HtmlEditorHandle } from './email-template-html-editor';

interface Props {
  templates: EmailTemplate[];
  onRefetch: () => void;
}

function StickyActionBar({
  active,
  onToggleActive,
  onPreview,
  onSendTest,
  onSaveDraft,
  onPublish,
  saving,
  publishing,
}: {
  active: boolean;
  onToggleActive: (v: boolean) => void;
  onPreview: () => void;
  onSendTest: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  saving: boolean;
  publishing: boolean;
}) {
  return (
    <div className='bg-background/80 sticky top-0 z-10 flex items-center justify-between border-b p-4 backdrop-blur'>
      <div className='flex items-center space-x-4'>
        <div className='flex items-center space-x-2 text-sm'>
          <span className='text-muted-foreground text-xs'>Hoạt động</span>
          <Switch checked={active} onCheckedChange={onToggleActive} />
        </div>
      </div>
      <div className='flex items-center space-x-2'>
        <Button size='sm' variant='ghost' onClick={onPreview}>
          <Eye className='mr-2 h-4 w-4' />
          Xem trước
        </Button>
        <Button size='sm' variant='ghost' onClick={onSendTest}>
          <Send className='mr-2 h-4 w-4' />
          Gửi test
        </Button>
        <Button size='sm' variant='outline' onClick={onSaveDraft} disabled={saving}>
          <Save className='mr-2 h-4 w-4' />
          {saving ? 'Đang lưu…' : 'Lưu'}
        </Button>
        <Button size='sm' onClick={onPublish} disabled={publishing}>
          <Upload className='mr-2 h-4 w-4' />
          {publishing ? 'Đang xuất bản…' : 'Xuất bản'}
        </Button>
      </div>
    </div>
  );
}

export function EmailTemplateEditorList({ templates, onRefetch }: Props) {
  const [local, setLocal] = useState<EmailTemplate[]>(() => templates.map((t) => ({ ...t })));

  // sync props -> local
  useEffect(() => {
    setLocal(templates.map((t) => ({ ...t })));
  }, [templates]);

  const updateMutation = useUpdateEmailTemplate();
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  const handleChange = useCallback(
    (id: string, field: keyof EmailTemplate, value: EmailTemplate[keyof EmailTemplate]) => {
      setLocal((prev) =>
        prev.map((p) => (p.id === id ? ({ ...p, [field]: value } as EmailTemplate) : p))
      );
    },
    []
  );

  const handleSaveDraft = useCallback(
    async (id: string) => {
      const item = local.find((l) => l.id === id);
      if (!item) return;
      setSavingIds((s) => ({ ...s, [id]: true }));
      try {
        await updateMutation.mutateAsync({
          templateId: id,
          data: {
            name: item.name,
            subject_template: item.subject_template,
            html_template: item.html_template,
            text_template: item.text_template,
            is_active: item.is_active ?? true,
          },
        });
        onRefetch();
      } catch (_e) {
        // noop - global notifications handle errors
      } finally {
        setSavingIds((s) => ({ ...s, [id]: false }));
      }
    },
    [local, updateMutation, onRefetch]
  );

  const handlePublish = useCallback(
    async (id: string) => {
      const item = local.find((l) => l.id === id);
      if (!item) return;
      setSavingIds((s) => ({ ...s, [id]: true }));
      try {
        await updateMutation.mutateAsync({
          templateId: id,
          data: {
            name: item.name,
            subject_template: item.subject_template,
            html_template: item.html_template,
            text_template: item.text_template,
            is_active: true, // Publish sets active
          },
        });
        onRefetch();
        setPublishModalOpen(false);
        setPublishNote('');
      } catch (_e) {
        // noop - global notifications handle errors
      } finally {
        setSavingIds((s) => ({ ...s, [id]: false }));
      }
    },
    [local, updateMutation, onRefetch]
  );

  const handleSendTest = useCallback((_id: string) => {
    setSendTestTemplateId(_id);
    setSendTestModalOpen(true);
  }, []);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | undefined>(undefined);
  const [previewVars, setPreviewVars] = useState<Record<string, unknown> | undefined>(undefined);
  const [openEditors, setOpenEditors] = useState<Record<string, boolean>>({});

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishTemplateId, setPublishTemplateId] = useState<string | undefined>(undefined);
  const [publishNote, setPublishNote] = useState('');

  const [sendTestModalOpen, setSendTestModalOpen] = useState(false);
  const [sendTestEmail, setSendTestEmail] = useState('');
  const [sendTestTemplateId, setSendTestTemplateId] = useState<string | undefined>(undefined);
  const sendTestMutation = useSendTestEmail();
  // refs for HTML editors so we can programmatically insert variables
  const editorRefs = useRef<Record<string, React.RefObject<HtmlEditorHandle>>>({});

  // Preview HTML cache
  const [previewHtmls, setPreviewHtmls] = useState<Record<string, string>>({});

  // Load preview HTML for templates
  useEffect(() => {
    local.forEach((t) => {
      if (t.html_template && !previewHtmls[t.id]) {
        getPreviewHtml(t.html_template)
          .then((html) => {
            setPreviewHtmls((prev) => ({ ...prev, [t.id]: html }));
          })
          .catch(() => {
            setPreviewHtmls((prev) => ({ ...prev, [t.id]: 'Lỗi tải preview' }));
          });
      }
    });
  }, [local, previewHtmls]);

  if (!templates || templates.length === 0) {
    return (
      <div className='text-muted-foreground py-8 text-center text-sm'>
        Không có template nào để chỉnh sửa.
      </div>
    );
  }

  return (
    <div className='grid gap-4'>
      {/* responsive grid: single column cards stacked, each card has internal 2-column layout on md+ */}
      {local.map((t) => (
        <Card key={t.id} className='overflow-visible'>
          <CardHeader>
            <CardTitle className='flex items-start justify-between gap-4'>
              <div className='flex-1'>
                <div className='flex items-center justify-between'>
                  <div className='text-sm font-semibold'>{t.name}</div>
                  <div className='text-muted-foreground text-xs'>ID: {t.id}</div>
                </div>
              </div>

              <StickyActionBar
                active={Boolean(t.is_active)}
                onToggleActive={(v: boolean) => handleChange(t.id, 'is_active', v)}
                onPreview={() => {
                  setPreviewTemplateId(t.id);
                  setPreviewVars({});
                  setPreviewOpen(true);
                }}
                onSendTest={() => handleSendTest(t.id)}
                onSaveDraft={() => handleSaveDraft(t.id)}
                onPublish={() => {
                  setPublishTemplateId(t.id);
                  setPublishModalOpen(true);
                }}
                saving={Boolean(savingIds[t.id]) || updateMutation.isPending}
                publishing={Boolean(savingIds[t.id]) || updateMutation.isPending}
              />
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue='subject' className='w-full'>
              <TabsList className='grid w-full grid-cols-5'>
                <TabsTrigger value='subject'>Subject</TabsTrigger>
                <TabsTrigger value='text'>Text</TabsTrigger>
                <TabsTrigger value='html'>HTML</TabsTrigger>
                <TabsTrigger value='variables'>Biến</TabsTrigger>
                <TabsTrigger value='history'>Lịch sử</TabsTrigger>
              </TabsList>

              <TabsContent value='subject' className='space-y-4'>
                <div>
                  <div className='mb-1 flex items-center justify-between'>
                    <label className='block text-sm font-medium'>Tiêu đề</label>
                    <span
                      className={`text-xs ${String(t.subject_template ?? '').length > 78 ? 'text-red-500' : 'text-muted-foreground'}`}
                    >
                      {String(t.subject_template ?? '').length}/78
                    </span>
                  </div>
                  <Input
                    value={t.subject_template ?? ''}
                    onChange={(e) => handleChange(t.id, 'subject_template', e.target.value)}
                    placeholder='Tiêu đề email (ví dụ: Đặt lại mật khẩu)'
                  />
                  {String(t.subject_template ?? '').length > 78 && (
                    <p className='mt-1 text-xs text-red-500'>
                      Tiêu đề quá dài, có thể bị cắt ngắn khi hiển thị.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value='text' className='space-y-4'>
                <div>
                  <label className='mb-1 block text-sm font-medium'>Mẫu văn bản</label>
                  <RichTextEditor
                    value={t.text_template ?? ''}
                    onChange={(html) => handleChange(t.id, 'text_template', html)}
                    placeholder='Phiên bản văn bản thuần của email (hỗ trợ rich text)'
                  />
                </div>
              </TabsContent>

              <TabsContent value='html' className='space-y-4'>
                <div>
                  <label className='mb-1 block text-sm font-medium'>Mẫu HTML</label>
                  <div className='bg-surface rounded border p-3'>
                    {!openEditors[t.id] ? (
                      <div
                        className='flex cursor-pointer items-start justify-between gap-3'
                        role='button'
                        tabIndex={0}
                        onClick={() => setOpenEditors((s) => ({ ...s, [t.id]: true }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setOpenEditors((s) => ({ ...s, [t.id]: true }));
                          }
                        }}
                      >
                        <div
                          className='prose text-muted-foreground max-h-40 overflow-hidden text-sm'
                          dangerouslySetInnerHTML={{
                            __html: previewHtmls[t.id] || 'Đang tải preview...',
                          }}
                        />
                        <div className='flex shrink-0 flex-col items-end gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenEditors((s) => ({ ...s, [t.id]: true }));
                            }}
                          >
                            Chỉnh sửa
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className='bg-surface rounded'>
                        <EmailTemplateHtmlEditor
                          // attach or create ref for this template
                          ref={
                            (editorRefs.current[t.id] =
                              editorRefs.current[t.id] ??
                              (React.createRef<HtmlEditorHandle>() as React.RefObject<HtmlEditorHandle>))
                          }
                          value={t.html_template ?? ''}
                          onChange={(val) => handleChange(t.id, 'html_template', val)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='variables' className='space-y-4'>
                <div>
                  <label className='mb-1 block text-sm font-medium'>Biến có sẵn</label>
                  <div className='flex flex-wrap gap-2'>
                    {(t.variables || []).map((variable) => {
                      if (!editorRefs.current[t.id]) {
                        editorRefs.current[t.id] =
                          React.createRef<HtmlEditorHandle>() as React.RefObject<HtmlEditorHandle>;
                      }
                      const handleClick = () => {
                        const ref = editorRefs.current[t.id];
                        if (ref?.current?.insertText) {
                          ref.current.insertText(`{{${variable}}}`);
                          void navigator.clipboard.writeText(`{{${variable}}}`);
                        } else {
                          void navigator.clipboard.writeText(`{{${variable}}}`);
                        }
                      };
                      return (
                        <Badge
                          key={variable}
                          variant='secondary'
                          className='cursor-pointer'
                          onClick={handleClick}
                        >
                          <Copy className='mr-1 h-3 w-3' />
                          {variable}
                        </Badge>
                      );
                    })}
                    {(t.variables || []).length === 0 && (
                      <span className='text-muted-foreground text-sm'>Không có biến nào</span>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='history' className='space-y-4'>
                <div className='text-muted-foreground text-sm'>
                  Lịch sử phiên bản sẽ được hiển thị ở đây.
                </div>
              </TabsContent>
            </Tabs>

            <Separator className='my-4' />

            <div className='text-muted-foreground flex items-center justify-between text-sm'>
              <div>
                Cập nhật: {t.updated_at ? new Date(t.updated_at).toLocaleString('vi-VN') : '—'}
              </div>
              <div className='flex items-center space-x-2'>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => {
                    setOpenEditors((s) => ({ ...s, [t.id]: false }));
                  }}
                >
                  Ẩn trình chỉnh sửa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <EmailTemplatePreviewModal
        open={previewOpen}
        onOpenChange={(o: boolean) => setPreviewOpen(o)}
        template={
          previewTemplateId ? (local.find((t) => t.id === previewTemplateId) ?? null) : null
        }
        variables={previewVars}
      />

      {/* Publish Modal */}
      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xuất bản Template</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xuất bản template này? Hành động này sẽ kích hoạt template và có thể
              ảnh hưởng đến email gửi đi.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium'>Ghi chú xuất bản (tùy chọn)</label>
              <DialogTextarea
                placeholder='Mô tả thay đổi...'
                value={publishNote}
                onChange={(e) => setPublishNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setPublishModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => publishTemplateId && handlePublish(publishTemplateId)}>
              Xuất bản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Test Modal */}
      <Dialog open={sendTestModalOpen} onOpenChange={setSendTestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gửi Test Email</DialogTitle>
            <DialogDescription>Nhập địa chỉ email để gửi test template này.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium'>Email nhận test</label>
              <Input
                type='email'
                placeholder='test@example.com'
                value={sendTestEmail}
                onChange={(e) => setSendTestEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setSendTestModalOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={async () => {
                if (!sendTestTemplateId) return;
                if (!sendTestEmail || !sendTestEmail.includes('@')) {
                  toast.error('Vui lòng nhập một địa chỉ email hợp lệ');
                  return;
                }
                try {
                  await sendTestMutation.mutateAsync({
                    templateId: sendTestTemplateId,
                    body: { to: sendTestEmail },
                  });
                  toast.success('Gửi test thành công');
                  setSendTestModalOpen(false);
                  setSendTestEmail('');
                } catch (err: unknown) {
                  // If backend doesn't support send-test (e.g. 404), fallback to render preview
                  let status: number | undefined = undefined;
                  if (err && typeof err === 'object' && 'status' in err) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    status = (err as any).status as number;
                  }
                  if (status === 404) {
                    toast('Backend không hỗ trợ gửi test trực tiếp; hiển thị preview thay thế', {
                      duration: 8000,
                    });
                    // Open preview modal for this template
                    setPreviewTemplateId(sendTestTemplateId);
                    setPreviewVars({});
                    setPreviewOpen(true);
                    setSendTestModalOpen(false);
                    setSendTestEmail('');
                    return;
                  }

                  let msg = 'Lỗi khi gửi test';
                  if (err && typeof err === 'object' && 'message' in err) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    msg = String((err as any).message ?? msg);
                  }
                  toast.error(msg || 'Lỗi khi gửi test');
                }
              }}
              disabled={sendTestMutation.isPending}
            >
              {sendTestMutation.isPending ? 'Đang gửi...' : 'Gửi Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmailTemplateEditorList;
