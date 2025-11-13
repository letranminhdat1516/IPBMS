// email-templates/components/email-template-form.tsx
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import RichTextEditor from '@/components/rich-text-editor';

import type { EmailTemplate, EmailTemplateFormData } from '../utils/types';

interface EmailTemplateFormProps {
  template?: EmailTemplate;
  onSubmit: (data: EmailTemplateFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function EmailTemplateForm({
  template,
  onSubmit,
  onCancel,
  loading = false,
}: EmailTemplateFormProps) {
  const [formData, setFormData] = React.useState<EmailTemplateFormData>({
    name: template?.name || '',
    type: (template?.type as EmailTemplateFormData['type']) || 'welcome',
    subject_template: template?.subject_template || '',
    html_template: template?.html_template || '',
    text_template: template?.text_template || '',
    is_active: template?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = (
    field: keyof EmailTemplateFormData,
    value: EmailTemplateFormData[keyof EmailTemplateFormData]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className='min-w-0 space-y-8'>
      {/* Header with Active Toggle */}
      <div className='flex items-center justify-end border-b pb-4'>
        {/* <div>
          <h2 className='text-xl font-semibold'>{template ? 'Chỉnh sửa' : 'Tạo'} Template Email</h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            Tạo template email với HTML và text content
          </p>
        </div> */}
        <div className='flex items-center space-x-3'>
          <Switch
            id='is-active'
            checked={formData.is_active}
            onCheckedChange={(checked) => updateField('is_active', checked)}
          />
          <Label htmlFor='is-active' className='text-sm font-medium'>
            Hoạt động
          </Label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-8'>
        {/* Basic Info */}
        <div className='grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3'>
          <div className='min-w-0 space-y-2'>
            <Label htmlFor='name'>Tên template</Label>
            <Input
              id='name'
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder='Ví dụ: Welcome Email'
              required
            />
          </div>
          <div className='min-w-0 space-y-2'>
            <Label htmlFor='type'>Loại template</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => updateField('type', value as EmailTemplateFormData['type'])}
            >
              <SelectTrigger>
                <SelectValue placeholder='Chọn loại template' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='welcome'>Welcome</SelectItem>
                <SelectItem value='password_reset'>Password Reset</SelectItem>
                <SelectItem value='subscription_expiry'>Subscription Expiry</SelectItem>
                <SelectItem value='security_alert'>Security Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='min-w-0 space-y-2'>
            <Label htmlFor='subject'>Tiêu đề email</Label>
            <Input
              id='subject'
              value={formData.subject_template}
              onChange={(e) => updateField('subject_template', e.target.value)}
              placeholder='Ví dụ: Chào mừng {{user_name}} đến với hệ thống'
              required
            />
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue='html' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='html'>Soạn thảo Email</TabsTrigger>
            <TabsTrigger value='text'>Text Content</TabsTrigger>
          </TabsList>

          <TabsContent value='html' className='space-y-4'>
            <div className='space-y-2'>
              <Label>Nội dung Email</Label>
              <RichTextEditor
                value={formData.html_template}
                onChange={(value) => updateField('html_template', value)}
                placeholder='Soạn thảo nội dung email...'
              />
              <div className='text-muted-foreground space-y-1 text-xs'>
                <p>
                  <strong>Mẹo:</strong> Sử dụng các công cụ định dạng để tạo email đẹp mắt. Email sẽ
                  tự động được chuyển đổi thành HTML tương thích.
                </p>
                <p>
                  Sử dụng <code>{'{{variable}}'}</code> để chèn biến động như tên người dùng, ngày
                  tháng, v.v.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='text' className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='text-content'>Nội dung Text</Label>
              <Textarea
                id='text-content'
                value={formData.text_template}
                onChange={(e) => updateField('text_template', e.target.value)}
                placeholder='Phiên bản văn bản thuần của email (tự động tạo từ HTML nếu để trống)'
                rows={20}
                className='min-h-[400px] resize-y font-mono text-sm'
              />
              <p className='text-muted-foreground text-xs'>
                Nếu để trống, hệ thống sẽ tự động chuyển đổi từ HTML.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Variables Info */}
        {template?.variables && template.variables.length > 0 && (
          <div className='space-y-3'>
            <Label className='text-sm font-medium'>Biến có sẵn</Label>
            <div className='bg-muted/50 flex flex-wrap gap-2 rounded-lg border p-4'>
              {template.variables.map((variable: string) => (
                <code
                  key={variable}
                  className='bg-background hover:bg-accent cursor-pointer rounded-md border px-3 py-1.5 font-mono text-sm transition-colors'
                  onClick={() => {
                    // Copy to clipboard
                    navigator.clipboard.writeText(`{{${variable}}}`);
                  }}
                  title='Click để sao chép'
                >
                  {`{{${variable}}}`}
                </code>
              ))}
            </div>
            <p className='text-muted-foreground text-xs'>
              Click vào biến để sao chép vào clipboard
            </p>
          </div>
        )}

        {/* Actions */}
        <div className='bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky bottom-0 -mx-6 mt-8 -mb-6 border-t px-6 py-4 backdrop-blur'>
          <div className='flex justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={onCancel}
              disabled={loading}
              className='min-w-[100px]'
            >
              Hủy
            </Button>
            <Button type='submit' disabled={loading} className='min-w-[120px]'>
              {loading ? (
                <div className='flex items-center gap-2'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  Đang lưu...
                </div>
              ) : template ? (
                'Cập nhật'
              ) : (
                'Tạo'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
